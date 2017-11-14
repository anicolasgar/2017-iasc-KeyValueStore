'use strict';
var express = require("express");
var parser = require("body-parser");
var args = require('margs').setDefault({maxmem: 100});
var app = express();

const http = require('http');
var port = args.get('port');

if (port === undefined) {
    console.log('nodejs server.js -port=<PORT>');
    process.exit();
}

const requestHandler = (request, response) => {
  console.log(request.url);
  response.end('Hello Node.js Server!');
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
	  console.log('No levanto el puerto', err);
    return
  }

  console.log('server is listening on port '+ port);

})
