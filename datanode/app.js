var config = require('./config');
var ioreq = require("socket.io-request");
var readline = require('readline');

var identificador;
var maxCantidadPares;
var orquestadores = [];

var diccionario = {};

var conectarMaestro = function(ip, puerto) {
    var io = require('socket.io-client');
    var socket = io.connect('http://' + ip + ':' + puerto, {reconnect: true});

    socket.on('connect', function (socket) {
        console.log('Conectado a orquestador maestro.');
    });

    socket.on('IDENTIFICADOR', function(datosInicializacion) {
        identificador = datosInicializacion.identificador;
        maxCantidadPares = datosInicializacion.maxCantidadPares;
    });

    socket.on('ORQUESTADORES', function(lista) {        
        orquestadores = lista;
    });

    socket.on('NUEVOORQUESTADOR', function(orquestador) {        
        orquestadores.push(orquestador);
    });

    socket.on('QUITARORQUESTADOR', function(identificador) {
        var orquestador = orquestadores.find(o => o.identificador == identificador);
        var index = orquestadores.indexOf(orquestador);
        orquestadores.splice(index, 1);
    });

    socket.on('disconnect', function() {
        socket.close();

        var nuevoMaestro = orquestadores.sort((a, b) => a.identificador < b.identificador ? -1 : 1)[0];

        var index = orquestadores.indexOf(nuevoMaestro);
        orquestadores.splice(index, 1);

        conectarMaestro(nuevoMaestro.ip, nuevoMaestro.puerto);
    });

    ioreq(socket).response("ADDKEY", function(req, res) {
        if (Object.keys(diccionario).length >= maxCantidadPares && !diccionario.hasOwnProperty(req.key))
            return res.error(new Error('La capacidad del nodo ha llego a su limite.'))

        diccionario[req.key] = req.value;

        res('Clave ' + req.key + ' insertada exitosamente.');
    });

    ioreq(socket).response("DELETE", function(req, res) {
        delete diccionario[req];

        res('Clave ' + req + ' borrada exitosamente.');
    });
    
    ioreq(socket).response("GET", function(req, res) {
        res(diccionario[req]);
    });

    ioreq(socket).response("MAYORES", function(req, res) {
        var mayores = Object.values(diccionario).filter(v => v > req);

        res(mayores);
    });

    ioreq(socket).response("MENORES", function(req, res) {
        var menores = Object.values(diccionario).filter(v => v < req);

        res(menores);
    });

    socket.emit('CONEXIONESCLAVO', identificador);
};

conectarMaestro(config.ipMaestro, config.puertoMaestro);


var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
  
rl.on('line', function(line) {
    switch (line) {
        case 'orquestadores':
            console.log(JSON.stringify(orquestadores, null, 4));
            break;

        case 'identificador':
            console.log(identificador);
            break;

        case 'datos':
            for (const prop in diccionario) {
                console.log(`${prop} = ${diccionario[prop]}`);
            };
            break;
    };
});