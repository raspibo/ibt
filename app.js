/**
 * I'll be there server app.
 */

var path = require('path');
var logger = require('morgan');
var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/ibt?auto_reconnect=true');
var fs = require('fs');
var http = require('http');
var https = require('https');

// If true, generates fake data for empty days.
var USE_MOCK_DATA = false;

var httpsOptions = {};

try {
	httpsOptions = {
		key: fs.readFileSync('ssl/ibt.key'),
		cert: fs.readFileSync('ssl/ibt.pem')
	};
} catch (error) {
	console.warn('missing certificates; https will not be enabled: ' + error);
}

var MongoClient = require('mongodb').MongoClient;

var app = express();

app.use(logger());
app.use(bodyParser());
app.use(express.static(path.join(__dirname, 'webui')));

var daysCollection = db.get('days');
var enabledDaysCollection = db.get('enabledDays');
var disabledDaysCollection = db.get('disabledDays');


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
		if (dayOfWeek == 1 || dayOfWeek == 4 || (dayOfWeek == 2 && (tueCounts == 2 || tueCounts == 4))) {
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


app.route('/data/groups/:id?')
.get(function(req, res, next) {
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
		}
		res.json(docs);
	});
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
.put(function(req, res, next) {
	var doc = req.body;
	var id = req.param('id');
	console.info('modify a document:');
	console.info(doc);
	daysCollection.updateById(id, doc, {}, function(err, rdoc) {
		if (err) {
			console.error('error modifying a document:');
			console.error(err);
			res.status(400).json({success: false, msg: err});
			return;
		}
		res.json(rdoc);
	});
})
.post(function(req, res, next) {
	var doc = req.body;
	console.info('create a new document:');
	console.info(doc);
	daysCollection.insert(doc, {}, function(err, rdoc) {
		if (err) {
			console.error('error creating a new document:');
			console.error(err);
			res.status(400).json({success: false, msg: err});
			return;
		}
		console.log('return doc:');
		console.log(rdoc);
		res.status(201).json(rdoc);
	});
})
.delete(function(req, res, next) {
	var id = req.param('id');
	console.info('remove group id:' + id);
	daysCollection.remove({_id: id}, {}, function(err, rdoc) {
		if (err) {
			console.error('error deleting document:');
			console.error(err);
			res.status(400).json({success: false, msg: err});
			return;
		}
		res.status(202).json({success: true});
	});
});


http.createServer(app).listen(3000);
if (httpsOptions.key && httpsOptions.cert) {
	https.createServer(httpsOptions, app).listen(3001);
}

