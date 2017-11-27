#!/usr/bin/env node
'use strict';
const program = require('commander');
var request = require('request');
var config = require('../orquestador/config');

var loadfunct = (clave,valor) => {
    request({ method: 'POST', url:'http://localhost:8084/load', form: {key:clave,value:valor}}, function(error, response,body) {
        if (!error && response.statuscode == 200) {
            console.log(response);
        }
        else if ( error ){
            console.log(error);
        }
     
    });
};

var getfunct = (clave) => {
    request.get({ url:'http://localhost:8084/get/' + clave}, function(error, response,body) {
        if (response.statuscode == 200) {
            console.log(response);
        }
        else if ( error ){
            console.log(error);
        }
        console.log('El valor de "' + clave + '" es ' +response.body);
    });
};

var listar = (clave) => {
    console.log(config.list);
}

program
    .version('0.0.1')
    .command('listar')
    .description('List all ips and ports')
    //.option('-o', 'List ips and port from orquestadores')
    //.option('-d', 'List ips and port from datanodes')
    .action(listar);
    
program
    .version('0.0.1')
    .command('load <clave> <valor>')
    .description('load key:value')
    .action(loadfunct);
    
program
    .version('0.0.1')
    .command('get <clave>')
    .description('get key')
    .action(getfunct);

program.parse(process.argv);

if (program.args.length === 0) program.help();