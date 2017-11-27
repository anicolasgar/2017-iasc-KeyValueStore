var config = {
    ip: 'localhost',
    puertoParaOrquestadores: '8080',
    puertoParaEsclavos: '8082',
    puertoApiRest: '8084',

    ipMaestro: 'localhost',
    puertoMaestro: '8080',

    maxLongitudClave: 50,
    maxLongitudValor: 50,
    maxCantidadPares: 2,
    
    list: ['http://localhost:8084','http://localhost:8080','http://localhost:8081']
};

module.exports = config;