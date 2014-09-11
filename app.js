/**
 * I'll be there server app.
 */

var path = require('path');
var logger = require('morgan');
var express = require('express');
var swig  = require('swig');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/ibt?auto_reconnect=true');
var MongoStore = require('connect-mongo')(session);

var fs = require('fs');
var bcrypt = require('bcrypt');

var http = require('http');
var https = require('https');

// If true, generates fake data for empty days.
var USE_MOCK_DATA = false;


var HTTP_PORT = 3000;
var HTTPS_PORT = 3001;
var PID_FILE = 'ibt.pid';

var httpsOptions = {};

try {
	httpsOptions = {
		key: fs.readFileSync('ssl/ibt.key'),
		cert: fs.readFileSync('ssl/ibt.pem')
	};
} catch (error) {
	console.warn('missing certificates; https will not be enabled: ' + error);
}


try {
	fs.writeFileSync(PID_FILE, process.pid.toString());
} catch (error) {
	console.log('Unable to write ' + PID_FILE + ': ' + err);
}


process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err);
	//setTimeout(connectToMongodb, 10000);
	process.exit(1);
});


var MongoClient;
var daysCollection;
var usersCollection;
var enabledDaysCollection;
var disabledDaysCollection;

function connectToMongodb() {
	MongoClient = require('mongodb').MongoClient;
	daysCollection = db.get('days');
	usersCollection = db.get('users');
	enabledDaysCollection = db.get('enabledDays');
	disabledDaysCollection = db.get('disabledDays');
}

connectToMongodb();

var app = express();

//app.use(logger());
app.use(cookieParser('secret'));
app.use(session({
	secret: 'session-secret',
	// TODO: reintroduce secure: true, for the cookies.
	cookie: {maxAge: 365*24*60*60*1000},
	store: new MongoStore({url: 'mongodb://localhost:27017/ibt/sessions'})

}));
app.use(bodyParser());

function enabledDates(year, month, includeDays, excludeDays) {
	month -= 1;
	var d = new Date(year, month);
	var validDays = [];
	var date;
	var dayOfWeek;
	var tueCounts = 0;
	includeDays = includeDays || [];
	excludeDays = excludeDays || [];
	while (d.getMonth() == month) {
		dayOfWeek = d.getDay();
		date = d.getDate();
		if (dayOfWeek == 2) {
			tueCounts += 1;
		}
		if (dayOfWeek == 4 || (dayOfWeek == 2 && (tueCounts == 2 || tueCounts == 4)) || (dayOfWeek == 1 && (year <= 2014 && month < 8) )) {
			if (excludeDays.indexOf(date) == -1) {
				validDays.push(date);
			}
		}
		d = new Date(year, month, date+1);
	}
	for (var i=0; i < includeDays.length; i++) {
		date = includeDays[i];
		if (validDays.indexOf(date) == -1) {
			validDays.push(date);
		}
	}
	return validDays;
}


var mock_groups = ['ninux', '3d', 'meteo', 'cycloscope', 'drones', 'robots', 'tavolo zero', 'killer robots'];
var mock_attendants = ['savino', 'dcast', 'oloturia', 'ale', 'itec', 'renzo', 'il tristo mietitore', 'mario'];
function genRandomGroups() {
	var group;
	var attendant;
	var attendants;
	var gdata;
	var groups = [];
	for (var i=0; i < Math.floor(Math.random()*mock_groups.length+1); i++) {
		group = mock_groups[Math.floor(Math.random()*mock_groups.length)];
		if (groups.indexOf(group) != -1) {
			continue;
		}
		gdata = {group: 'fake_' + group};
		attendants = [];
		for (var j=0; j < Math.floor(Math.random()*mock_attendants.length+1); j++) {
			attendant = mock_attendants[Math.floor(Math.random()*mock_attendants.length)];
			if (attendants.indexOf(attendant) != -1) {
				continue;
			}
			attendants.push(attendant);
		}
		gdata['attendants'] = [];
		for (var x=0; x < attendants.length; x++) {
			gdata['attendants'].push({name: 'fake_' + attendants[x]});
		}
		groups.push(gdata);
	}
	return groups;
}


app.route('(/|/*\.html)')
.get(function(req, res, next) {
	var url = req.params[0];
	if (url == '/' || !url) {
		url = '/index.html';
	}
	var userData = {};
	usersCollection.find({username: req.session.username}, {}, function(err, docs) {
		if (docs.length == 1) {
			userData = docs[0];
			delete userData.password;
		}
		var page = swig.renderFile(path.join(__dirname, 'templates/' + url),
			{userData: userData,
			reqProtocol: req.protocol,
			reqHost: req.host,
			httpsPort: HTTPS_PORT
			});
		res.send(page);
	});
});

app.use(express.static(path.join(__dirname, 'static')));

app.route('/utils/:util')
.get(function(req, res, next) {
	if (req.params.util == 'valid-dates-in-month') {
		var year = parseInt(req.param('year'));
		var month = parseInt(req.param('month'));
		var includeDays = [];
		var excludeDays = [];
		if (!(year && month)) {
			console.error('incomplete date; year:' + year + ' month:' + month);
			res.status(404).json({success: false, msg: 'incomplete date'});
			return;
		}
		// Fetch extra enabled/disabled days.
		enabledDaysCollection.find({year: year, month: month}).on('complete', function(err, docs) {
			if (err) { docs = []; }
			for (var i=0; i < docs.length; i++) {
				includeDays.push(docs[i].day);
			}
			disabledDaysCollection.find({year: year, month: month}).on('complete', function(err, docs) {
				if (err) { docs = []; }
				for (var i=0; i < docs.length; i++) {
					excludeDays.push(docs[i].day);
				}
				res.json(enabledDates(req.param('year'), req.param('month'), includeDays, excludeDays));
			});
		});
	}
});


function addUserToGroup(req, res, id, name) {
	daysCollection.findById(id, function(err, doc) {
		var currentAttendants = doc.attendants || [];
		for (var i=0; i < currentAttendants.length; i++) {
			if (currentAttendants[i].name == name) {
				res.json(doc);
				return;
			}
		}
		currentAttendants.push({name: name, _createdBy: req.session.username});
		doc.attendants = currentAttendants;
		daysCollection.updateById(id, doc, {}, function(err, rdoc) {
			res.json(doc);
		});
	});
}


app.route('/data/groups/:id/attendant')
.post(function(req, res, next) {
	/* Add a user to a group. */
	var id = req.param('id');
	var name = req.param('name');
	addUserToGroup(req, res, id, name);
})
.delete(function(req, res, next) {
	/* Remove a user from a group. */
	var id = req.param('id');
	var name = req.param('name');
	daysCollection.findById(id, function(err, doc) {
		var attendants = [];
		var currentAttendants = doc.attendants || [];
		var attendant;
		for (var i=0; i < currentAttendants.length; i++) {
			attendant = currentAttendants[i];
			if (attendant.name != name) {
				attendants.push(attendant);
			} else if (attendant._createdBy && attendant._createdBy != req.session.username) {
				console.log('user ' + req.session.username + ' attempted to delete user ' + attendant.name + ' created by ' + attendant._createdBy + 'on document:');
				console.log(doc);
				attendants.push(attendant);
			}
		}
		if (attendants.length > 0) {
			doc.attendants = attendants;
			daysCollection.updateById(id, doc, {}, function(err, rdoc) {
				res.json(doc);
			});
		} else {
			/* No more attendants: also remove the whole group. */
			daysCollection.remove({_id: id}, {}, function(err, rdoc) {
				if (err) {
					console.error('error deleting document:');
					console.error(err);
					res.status(400).json({success: false, msg: err});
					return;
				}
				res.status(202).json({removed: true});
			});
		}
	});
});


app.route('/data/groups/:id?')
.get(function(req, res, next) {
	var id = req.param('id');
	if (id) {
		daysCollection.findById(id, function(err, doc) {
			res.json(doc);
		});
	} else {
		var date = req.param('day');
		daysCollection.find({date: date}, {}, function(err, docs) {
			if (err) {
				console.error('error fetching groups list: ' + err);
				res.status(400).json([]);
				return;
			}
			console.log('docs.length: ' + docs.length);
			console.log('docs:');
			console.log(docs);
			if (USE_MOCK_DATA && !docs.length) {
				res.json(genRandomGroups());
				return;
			}
			res.json(docs);
		});
	}
})
.all(function(req, res, next) {
	// Preliminary checks for the following methods.
	if (req.method == 'put' || req.method == 'delete') {
		if (!req.param('id')) {
			console.error('missing ID');
			res.status(404).json({success: false, msg: 'missing ID'});
			return;
		}
		if (req.method != 'delete') {
			if (!req.body) {
				console.error('missing document');
				res.status(404).json({success: false, msg: 'missing document'});
				return;
			}
		}
	}
	next();
})
.post(function(req, res, next) {
	var doc = req.body;
	console.info('create a new document:');
	console.info(doc);
	var attendant = {};
	if (doc.attendants.length > 0) {
		doc.attendants[0]._createdBy = req.session.username;
		attendant = doc.attendants[0];
	}
	daysCollection.find({date: doc.date, group: doc.group}, {}, function(err, docs) {
		if (docs.length == 0) {
			daysCollection.insert(doc, {}, function(err, rdoc) {
				if (err) {
					console.error('error creating a new document:');
					console.error(err);
					res.status(400).json({success: false, msg: err});
					return;
				}
				res.status(201).json(doc);
			});
		} else {
			addUserToGroup(req, res, docs[0]._id, attendant.name);
		}
	});
})
.delete(function(req, res, next) {
	/* Prevents 404 generated by the 'destroy' call on the client-side model. */
	res.status(202).json({success: true});
	return;
});


app.route('/login')
.post(function(req, res, next) {
	var doc = req.body;
	if (!(doc.username && doc.password)) {
		res.json({success: false, msg: 'empty username or password'});
		return;
	}
	usersCollection.find({username: doc.username}, {}, function(err, docs) {
		if (docs.length != 1) {
			res.json({success: false, msg: 'user not found'});
			return;
		}
		bcrypt.compare(doc.password, docs[0].password, function(err, result) {
			var ret = {success: result};
			if (!result) {
				ret['msg'] = 'wrong username or password';
				res.json(ret);
				return;
			}
			req.session.username = doc.username;
			req.session.save(function(err) {
				res.json(ret);
			});
		});
	});
});


app.route('/register')
.post(function(req, res, next) {
	var doc = req.body;
	if (!(doc.username && doc.password)) {
		res.json({success: false, msg: 'empty username or password'});
		return;
	}
	usersCollection.find({username: doc.username}, {}, function(err, docs) {
		if (docs.length > 0) {
			res.json({success: false, msg: 'user already present'});
			return;
		}
		bcrypt.genSalt(10, function(err, salt) {
			bcrypt.hash(doc.password, salt, function(err, hash) {
				var user = {
					username: doc.username,
					password: hash,
					real_name: doc.real_name,
					email: doc.email
				};
				usersCollection.insert(user, {}, function(err, rdoc) {
					if (!err) {
						req.session.username = doc.username;
					}
					res.json({success: !err});
				});
			});
		});
	});
});


app.route('/logout')
.get(function(req, res, next) {
	if (req.session.username) {
		req.session.destroy(function(err) {});
	}
	res.redirect('/');
});


http.createServer(app).listen(HTTP_PORT);
if (httpsOptions.key && httpsOptions.cert) {
	https.createServer(httpsOptions, app).listen(HTTPS_PORT);
}

