var config = require('./config');
var ioreq = require("socket.io-request");

var identificador;
var orquestadores = [];

var diccionario = {};

var conectarMaestro = function(ip, puerto) {
    var io = require('socket.io-client');
    var socket = io.connect('http://' + ip + ':' + puerto, {reconnect: true});

    socket.on('connect', function (socket) {
        console.log('Conectado a orquestador maestro.');
    });

    socket.on('IDENTIFICADOR', function(nuevoId) {
        console.log(nuevoId);
        identificador = nuevoId;
    });

    socket.on('ORQUESTADORES', function(lista) {        
        orquestadores = lista;

        console.log(JSON.stringify(orquestadores));
    });

    socket.on('NUEVOORQUESTADOR', function(orquestador) {        
        orquestadores.push(orquestador);

        console.log(JSON.stringify(orquestadores));
    });

    socket.on('QUITARORQUESTADOR', function(identificador) {
        var orquestador = orquestadores.find(o => o.identificador == identificador);
        var index = orquestadores.indexOf(orquestador);
        orquestadores.splice(index, 1);

        console.log(JSON.stringify(orquestadores));
    });

    socket.on('disconnect', function() {
        console.log('murio papa');
        socket.close();

        var nuevoMaestro = orquestadores.sort((a, b) => a.identificador < b.identificador ? -1 : 1)[0];

        var index = orquestadores.indexOf(nuevoMaestro);
        orquestadores.splice(index, 1);

        conectarMaestro(nuevoMaestro.ip, nuevoMaestro.puerto);
    });

    ioreq(socket).response("ADDKEY", function(req, res) {
        //res(req.toUpperCase()); // return to client
        //res.error(new Error('no anda nada con ' + req));

        diccionario[req.key] = req.value;

        console.log('Clave ' + req.key + ' insertada exitosamente.');

        res('Clave ' + req.key + ' insertada exitosamente.');
    });

    ioreq(socket).response("DELETE", function(req, res) {
        delete diccionario[req];

        console.log('Clave ' + req + ' borrada exitosamente.');

        res('Clave ' + req + ' borrada exitosamente.');
    });
    
    ioreq(socket).response("GET", function(req, res) {
        //res(req.toUpperCase()); // return to client
        //res.error(new Error('no anda nada con ' + req));

        console.log(diccionario[req]);

        res(diccionario[req]);
    });

    ioreq(socket).response("MAYORES", function(req, res) {
        //res(req.toUpperCase()); // return to client
        //res.error(new Error('no anda nada con ' + req));

        var mayores = Object.values(diccionario).filter(v => v > req);

        console.log(JSON.stringify(mayores));

        res(mayores);
    });

    ioreq(socket).response("MENORES", function(req, res) {
        //res(req.toUpperCase()); // return to client
        //res.error(new Error('no anda nada con ' + req));

        var menores = Object.values(diccionario).filter(v => v < req);

        console.log(JSON.stringify(menores));

        res(menores);
    });

    socket.emit('CONEXIONESCLAVO', identificador);
};

conectarMaestro(config.ipMaestro, config.puertoMaestro);