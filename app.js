
var path = require('path');
var logger = require('morgan');
var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/ibt');

var app = express();

app.use(logger());
app.use(bodyParser());
app.use(express.static(path.join(__dirname, 'webui')));

function enabledDates(year, month) {
	month -= 1;
	var d = new Date(year, month);
	var validDays = [];
	var date;
	var dayOfWeek;
	var tueCounts = 0;
	while (d.getMonth() == month) {
		dayOfWeek = d.getDay();
		date = d.getDate();
		if (dayOfWeek == 2) {
			tueCounts += 1;
		}
		if (dayOfWeek == 1 || dayOfWeek == 4 || (dayOfWeek == 2 && (tueCounts == 2 || tueCounts == 4))) {
			validDays.push(date);
		}
		d = new Date(year, month, date+1);
	}
	return validDays;
}


app.route('/utils/:util')
.get(function(req, res, next) {
	if (req.params.util == 'valid-dates-in-month') {
		res.json(enabledDates(req.param('year'), req.param('month')));
	}
});

var groups_mock = [
	{name: 'ninux', attendants: [{name: 'savino'}, {name: 'dcast'}]},
	{name: 'meteo', attendants: [{name: 'paolo'}]}
]

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

var daysCollection = db.get('days');

app.route('/data/groups')
.get(function(req, res, next) {
	var date = req.param('day');
	daysCollection.find({date: date}, {}, function(err, docs) {
		if (err) {
			console.error('ERROR: ' + err);
			res.json([]);
			return;
		}
		console.log('DOCS.length: ' + docs.length);
		res.json(docs);
		/*
		if (!docs.length) {
			//res.json(genRandomGroups());
		}
		*/
	});
}).post(bodyParser(), function(req, res, next) {
	var doc = req.body;
	if (!doc) {
		console.error('NO DATA RECEIVED');
		res.json('failure');
		return;
	}
	if (doc._isnew) {
		delete doc._isnew;
	}
	if (doc._id) {
		daysCollection.updateById(doc._id, doc);
		res.json(doc);
	} else {
		console.log(doc);
		/*
		daysCollection.insert(doc, function (err, rdoc) {
			res.json(rdoc);
		});
		*/
	}
});

app.listen(3000);

