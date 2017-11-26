#!/usr/bin/env node
'use strict';
const program = require('commander');
var config = require('../orquestador/config');



program
    .version('0.0.1')
    .command('listar')
    .description('List all ips and ports')
    //.option('-o', 'List ips and port from orquestadores')
    //.option('-d', 'List ips and port from datanodes')
    .action(console.log(config.list));
    


program.parse(process.argv);

if (program.args.length === 0) program.help();