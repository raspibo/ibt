
var path = require('path');
var express = require('express');

var app = express();

app.use(express.static(path.join(__dirname, 'webui')));

app.get('/groups*', function(req, res){
	res.send(req);
});

app.listen(3000);

