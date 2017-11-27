var express = require('express');
var parser = require('body-parser');
var uniqid = require('uniqid');
var ioreq = require("socket.io-request");
var readline = require('readline');

var config = require('./config');
var hash = require('./hash');

var args = process.argv.slice(2);

var maestro = args[0] == 'master';
var orquestadores = [];
var esclavos = [];
var identificador;

// Creacion del socket que escucha la conexion de los orquestadores backup
var crearServerParaOrquestadores = function() {
    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);

    // callback que se ejecuta cuando se conecta un orquestador
    io.on('connection', function(client) {
        console.log('Orquestador nuevo conectado.')

        var orquestador;

        // Callback que se ejecuta cuando el otro orquestador envia el evento "CONEXIONORQUESTADOR"
        client.on('CONEXIONORQUESTADOR', function(nuevoOrquestador) {
            // Si el orquestador que envia el mensaje no tiene un identificador, indica que es nuevo
            if (!nuevoOrquestador.identificador) {
                orquestador = {};
                orquestador.identificador = uniqid();
                orquestador.socket = client;
                orquestador.ip = nuevoOrquestador.ip;
                orquestador.puertoParaOrquestadores = nuevoOrquestador.puertoParaOrquestadores;
                orquestador.puertoParaEsclavos = nuevoOrquestador.puertoParaEsclavos;

                // Se le envia al orquestador cual es su identificador
                client.emit('IDENTIFICADOR', orquestador.identificador);
                
                // Se notifica a los otros orquestadores que hay un nuevo orquestador
                orquestadores.forEach(o => o.socket.emit('NUEVOORQUESTADOR', paqueteOrquestador(orquestador)));

                // Se notifica a los esclavos que hay un nuevo orquestador
                esclavos.forEach(e => e.socket.emit('NUEVOORQUESTADOR', paqueteOrquestadorParaEsclavo(orquestador)));

                orquestadores.push(orquestador);

                // Se le indica al nuevo orquestador cual es el conjunto actual de orquestadores
                client.emit('ORQUESTADORES', orquestadores.map(paqueteOrquestador));

                // Se le indica al nuevo orquestador cual es el conjunto actual de esclavos
                client.emit('ESCLAVOS', esclavos.map(paqueteEsclavo));
            }
            // Si el orquestador tiene id, ya existia de antes, asi que solo se le asocia con el socket
            else {
                orquestador = orquestadores.find(o => o.identificador == nuevoOrquestador.identificador);
                orquestador.socket = client;
            };
        });

        // Callback que se ejecuta si se desconecta el nodo
        // Cuando se cae el nodo, se lo borra de la lista y se notifica tanto a los demas orquestadores como esclavos
        client.on('disconnect', function() {
            var index = orquestadores.indexOf(orquestador);
            orquestadores.splice(index, 1);

            orquestadores.forEach(o => o.socket.emit('QUITARORQUESTADOR', orquestador.identificador));
            esclavos.forEach(e => e.socket.emit('QUITARORQUESTADOR', orquestador.identificador));

            console.log(orquestadores.length);
        });
    });

    http.listen(config.puertoParaOrquestadores);
};


// Creacion del socket que escucha las conexiones de nodos esclavos
var crearServerParaEsclavos = function() {
    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);

    io.on('connection', function(client) {
        console.log('Esclavo nuevo conectado.')

        var esclavo;

        client.on('CONEXIONESCLAVO', function(identificador) {
            if (!identificador) {
                esclavo = {};
                esclavo.identificador = uniqid();
                esclavo.socket = client;
                esclavos.push(esclavo);

                client.emit('IDENTIFICADOR', { identificador: esclavo.identificador, maxCantidadPares: config.maxCantidadPares });
                
                // Se notifica a los orquestadores que hay un nuevo nodo esclavo
                orquestadores.forEach(o => o.socket.emit('NUEVOESCLAVO', paqueteEsclavo(esclavo)));

                // Se le indica al nuevo esclavo cuales son los orquestadores actuales
                client.emit('ORQUESTADORES', orquestadores.map(paqueteOrquestadorParaEsclavo));
            }
            else {
                esclavo = esclavos.find(e => e.identificador == identificador);
                esclavo.socket = client;
            };
        });

        // Si el nodo esclavo se cae, se lo quita de la lista y se notifica a los orquestadores
        client.on('disconnect', function() {
            var index = esclavos.indexOf(esclavo);
            esclavos.splice(index, 1);

            orquestadores.forEach(o => o.socket.emit('QUITARESCLAVO', esclavo.identificador));

            console.log(esclavos.length);
        });
    });

    http.listen(config.puertoParaEsclavos);
};

// Creacion de socket para conectar al nodo maestro
var conectarMaestro = function(ip, puerto) {
    var io = require('socket.io-client');
    var socket = io.connect('http://' + ip + ':' + puerto, {reconnect: true});

    socket.on('connect', function (socket) {
        console.log('Conectado a orquestador maestro.');
    });
    
    // Asignacion de id por parte del maestro
    socket.on('IDENTIFICADOR', function(nuevoId) {
        console.log(nuevoId);
        identificador = nuevoId;
    });

    // Seteo de orquestadores enviado por el maestro
    socket.on('ORQUESTADORES', function(lista) {        
        orquestadores = lista;

        console.log(JSON.stringify(orquestadores, null, 4));
    });

    // Notificacion de nuevo nodo por parte del maestro
    socket.on('NUEVOORQUESTADOR', function(orquestador) {        
        orquestadores.push(orquestador);

        console.log(JSON.stringify(orquestadores));
    });

    // Notificacion del maestro sobre orquestador caido
    socket.on('QUITARORQUESTADOR', function(identificador) {
        var orquestador = orquestadores.find(o => o.identificador == identificador);
        var index = orquestadores.indexOf(orquestador);
        orquestadores.splice(index, 1);

        console.log(JSON.stringify(orquestadores));
    });

    // Seteo de esclavos por parte del maestro
    socket.on('ESCLAVOS', function(lista) {        
        esclavos = lista;

        console.log(JSON.stringify(esclavos));
    });

    // Nuevo esclavo
    socket.on('NUEVOESCLAVO', function(esclavo) {        
        esclavos.push(esclavo);

        console.log(JSON.stringify(esclavos));
    });

    socket.on('QUITARESCLAVO', function(identificador) {
        var esclavo = esclavos.find(e => e.identificador == identificador);
        var index = esclavos.indexOf(esclavo);
        esclavos.splice(index, 1);

        console.log(JSON.stringify(esclavos));
    });

    // Callback que se ejecuta si se cae el nodo maestro
    socket.on('disconnect', function() {
        console.log('murio papa');
        socket.close();

        // El nuevo nodo maestro, se elige por orden alfabetico del identificador...
        var nuevoMaestro = orquestadores.sort((a, b) => a.identificador < b.identificador ? -1 : 1)[0];

        // Borro al nuevo nodo maestro de la lista de orquestadores backup
        var index = orquestadores.indexOf(nuevoMaestro);
        orquestadores.splice(index, 1);

        // Si el nuevo nodo maestro soy yo, creo los sockets para escuchar
        if (nuevoMaestro.identificador == identificador) {
            crearServerParaOrquestadores();
            crearServerParaEsclavos();
            crearApiRest();
        }
        // Si el nuevo maestro es otro, me conecto a el
        else {
            conectarMaestro(nuevoMaestro.ip, nuevoMaestro.puertoParaOrquestadores);
        };
    });

    // Una vez configurado el socket de conexion al maestro, le envio mis datos
    socket.emit('CONEXIONORQUESTADOR', {
        identificador: identificador,
        ip: config.ip,
        puertoParaOrquestadores: config.puertoParaOrquestadores,
        puertoParaEsclavos: config.puertoParaEsclavos
    });
};

var crearApiRest = function() {
    var app = express();

    app.use(parser.urlencoded({ extended: true }));
    app.use(parser.json());

//comando para probar el post
//wget --post-data "key=clave&value=valor" http://localhost:8084/load
    app.post('/load', function(req, res){
        var key = req.body.key;
        var value = req.body.value;

        if (key.length > config.maxLongitudClave)
            return res.status(400).send('La longitud de la clave debe tener un máximo de ' + config.maxLongitudClave + ' caracteres.')

        if (value.length > config.maxLongitudValor)
            return res.status(400).send('La longitud del valor debe tener un máximo de ' + config.maxLongitudValor + ' caracteres.')

        var index = hash(key, esclavos.length);

        var esclavo = esclavos[index];

        ioreq(esclavo.socket).request("ADDKEY", { key: key, value: value })
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(errorEsclavo){
            console.error(errorEsclavo);
            res.status(500).send(errorEsclavo);
        });        
    });
    
    app.get('/get/:key', function(req, res){
        var key = req.params.key;

        var index = hash(key, esclavos.length);

        var esclavo = esclavos[index];

        ioreq(esclavo.socket).request("GET", key)
        .then(function(respuestaEsclavo) {
            console.log(respuestaEsclavo);

            if (respuestaEsclavo === undefined)
                res.sendStatus(404);
            else
                res.status(200).send(respuestaEsclavo);
        })
        .catch(function(errorEsclavo){
            console.error(errorEsclavo);
            res.status(500).send(errorEsclavo);
        }); 
    });

    app.delete('/delete/:key', function(req, res){
        var key = req.params.key;

        var index = hash(key, esclavos.length);

        var esclavo = esclavos[index];

        ioreq(esclavo.socket).request("DELETE", key)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(errorEsclavo){
            console.error(errorEsclavo);
            res.status(500).send(errorEsclavo);
        }); 
    });

    app.get('/mayores/:valor', function(req, res){
        var valor = req.params.valor;

        var promesas = esclavos.map(e => ioreq(e.socket).request("MAYORES", valor));

        Promise.all(promesas)
        .then(function(listaDeRangos){
            console.log(JSON.stringify(listaDeRangos));

            var mayores = listaDeRangos.reduce((a, b) => a.concat(b));

            res.status(200).send(mayores);
        })
        .catch(function(errorEsclavo){
            console.error(errorEsclavo);
            res.status(500).send(errorEsclavo);
        }); 
    });

    app.get('/menores/:valor', function(req, res){
        var valor = req.params.valor;

        var promesas = esclavos.map(e => ioreq(e.socket).request("MENORES", valor));

        Promise.all(promesas)
        .then(function(listaDeRangos){
            console.log(JSON.stringify(listaDeRangos));

            var menores = listaDeRangos.reduce((a, b) => a.concat(b));

            res.status(200).send(menores);
        })
        .catch(function(errorEsclavo){
            console.error(errorEsclavo);
            res.status(500).send(errorEsclavo);
        }); 
    });

    app.listen(config.puertoApiRest, function () {
        console.log('API REST escuchando en puerto ' + config.puertoApiRest);
    });
};


var paqueteOrquestador = function (orquestador) {
    return {
        identificador: orquestador.identificador,
        ip: orquestador.ip,
        puertoParaOrquestadores: orquestador.puertoParaOrquestadores,
        puertoParaEsclavos: orquestador.puertoParaEsclavos
    };
};

var paqueteOrquestadorParaEsclavo = function (orquestador) {
    return {
        identificador: orquestador.identificador,
        ip: orquestador.ip,
        puerto: orquestador.puertoParaEsclavos
    };
};

var paqueteEsclavo = function (esclavo) {
    return {
        identificador: esclavo.identificador
    };
};

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
  
rl.on('line', function(line) {
    switch (line) {
        case 'orquestadores':
            console.log(JSON.stringify(orquestadores.map(paqueteOrquestador), null, 4));
            break;
    };
})

if (maestro) {
    crearServerParaOrquestadores();
    crearServerParaEsclavos();
    crearApiRest();
}
else {
    conectarMaestro(config.ipMaestro, config.puertoMaestro);
};