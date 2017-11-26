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

    ioreq(socket).response("ADDKEY", function(req, res){ // method, handler
        //res(req.toUpperCase()); // return to client
        //res.error(new Error('no anda nada con ' + req));

        diccionario[req.key] = req.value;

        res('Clave ' + req.key + ' insertada exitosamente.');
    });

    ioreq(socket).response("DELETEKEY", function(req, res){ // method, handler
        if (diccionario[req.key]) {
            delete diccionario[req.key];
            res('Clave ' + req.key + ' borrada exitosamente.');
        }
        else{
            res('Clave ' + req.key + ' no existe.');
        }
    });
    
    ioreq(socket).response("GET", function(req, res){ // method, handler
        //res(req.toUpperCase()); // return to client
        //res.error(new Error('no anda nada con ' + req));

        res(diccionario[req]);
    });

    socket.emit('CONEXIONESCLAVO', identificador);
};

conectarMaestro(config.ipMaestro, config.puertoMaestro);