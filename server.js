'use strict'
var express = require('express');
var parser = require('body-parser');
var args = require('margs').setDefault({maxmem: 100});
var app = express();

app.use(parser.urlencoded({extended:false}));
app.use(parser.json());

var port = args.get('port');

if (port === undefined) {
    console.log('nodejs server.js -port=<PORT>');
    process.exit();
};

app.listen(port, (err) => {
  if (err) {
	  console.log('No levanto el puerto', err);
    return
  }
  console.log('server is listening on port '+ port);
});

app.get('/', function(req,res){
  res.send({title: "Diccionario distribuido"});
});

app.get('/prueba', function(req,res){
  res.send({message: "asd"});
});

//Creating dictionary
var dict = new Object();

app.get('/load/:key/:value', function(req, res){
  var key = req.params.key;
  var value = req.params.value;
  dict[key] = value;
  console.log('Diccionario: ' + dict);
  var responseObject = { message: 'Se agrego al diccionario, Key: '+ key +' '+'Value: '+ value };
  res.send(responseObject);
});
