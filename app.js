const express = require('express')
const app = express()
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const Eureka = require('eureka-js-client').Eureka
const neo4j_calls = require('./neo4j_calls/neo4j_api')

const client = new Eureka({
    instance: {
        app: 'fly-pal-server-neo4j',
        hostName: 'localhost',
        ipAddr: '127.0.0.1',
        port: {
            $: 8080,
            '@enabled': true,
        },
        vipAddress: 'fly.pal.neo4j.com',
        dataCenterInfo: {
            '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
            name: 'MyOwn',
        },
    },
    eureka: {
        // eureka server host / port / servicePath
        host: 'localhost',
        port: 8761,
        servicePath: '/eureka/apps/',
    },
})

// uncomment to connect to eureka-service:
//client.start();

//get eureka instances like this:
//const instances = client.getInstancesByAppId("app");

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))

//Sending a GET to localhost:8080/dummy should return this
app.get('/dummy', (req, res) =>
    res.send('Response from Route of the Express Server!!')
)

app.listen(8080)
app.use(bodyParser.json())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
let api = require('./routes/api')
app.use('/api', api)

console.log('Server running on 8080...')

app.use(express.static('./public/index.html'))


async function initialize_db() {
    await neo4j_calls.load_database()
    await neo4j_calls.graphs_drop()
    await neo4j_calls.graphs_create()
}
initialize_db();

//app.use(function (req, res, next) {
//res.header("Access-Control-Allow-Origin", "*");
//res.header(
//"Access-Control-Allow-Headers",
//"Origin, X-Requested-With, Content-Type, Accept"
//);
//next();
//});
module.exports = app
