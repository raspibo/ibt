
var path = require('path');
var logger = require('morgan');
var express = require('express');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/ibt');

var app = express();

app.use(logger());
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

app.route('/data*')
.get(function(req, res, next) {
	res.send('DATA get ' + req.path);
}).post(function(req, res, next) {
	res.send('DATA put');
}).all(function(req, res, next) {
	res.send('DATA all');
});

app.get('/groups*', function(req, res){
	res.send("XIAO");
});

app.listen(3000);

