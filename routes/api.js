const express = require('express')
const router = express.Router()
const neo4j_calls = require('../neo4j_calls/neo4j_api')
const bcrypt = require('bcrypt')
const saltRounds = 10
const { createToken, validateToken } = require('../jwt')

router.get('/', async function (req, res, next) {
    res.status(200).send('Root Response from FlyPal Server @ :8080/api')
    return 700000
})

router.post('/login', async (req, res) => {
    let { email, passwd } = req.body
    let user = await neo4j_calls.login_user(email)

    if (!user.error) {
        bcrypt.compare(passwd, user.passwd, (err, result) => {
            if (result) {
                const { passwd, ...userPassTrunc } = user
                const accessToken = createToken(user)
                res.cookie('flypal-token', accessToken, {
                    maxAge: 2592000000,
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true,
                })
                res.status(200).send(userPassTrunc)
            } else {
                res.status(200).send({ error: 'Bad password!' })
            }
        })
    } else {
        return res.status(200).send(user)
    }
    return 700000
})

router.get('/login', validateToken, async (req, res) => {
    res.status(200).send(req.token)
    return 700000
})

router.post('/register', function (req, res, next) {
    let { username, email, passwd } = req.body

    bcrypt.hash(passwd, saltRounds, async (err, hash) => {
        if (err) {
            console.log(err)
        }
        let user = await neo4j_calls.create_user(username, email, hash)
        const { passwd, ...userPassTrunc } = user
        const accessToken = createToken(user)
        res.cookie('flypal-token', accessToken, {
            maxAge: 2592000000,
            httpOnly: true,
            sameSite: 'none',
            secure: true,
        })
        console.log('user: ', userPassTrunc)
        res.status(200).send(userPassTrunc)
    })
    return 700000
})

router.get('/logout', async function (req, res, next) {
    res.clearCookie('flypal-token')
    res.end()
})

router.get('/neo4j_get', validateToken, async function (req, res, next) {
    let result = await neo4j_calls.get_num_nodes()
    res.status(200).send({
        count: result,
        hello: req.token.username,
    })
    return { result }
})

router.get('/neo4j_get_cities', async function (req, res, next) {
    let result = await neo4j_calls.get_all_cities()
    res.status(200).send(result)
    return { result }
})

router.post('/neo4j_post_city', validateToken, async function (req, res, next) {
    let { country, name, lat, lng } = req.body
    let role = req.token.role
    if (role === 'admin') {
        console.log('Welcome mister admin')
        let city = await neo4j_calls.create_city(country, name, lat, lng)
        res.status(200).send('City ' + city + ' created')
    } else {
        console.log('Insufficent permissions!')
        res.status(200).send({ error: 'Insufficent permissions!' })
    }
    return 700000
})

router.post(
    '/neo4j_post_flight',
    validateToken,
    async function (req, res, next) {
        let { startCity, endCity, time, cost } = req.body
        let role = req.token.role
        if (role === 'admin') {
            console.log('Welcome mister admin')
            let flight = await neo4j_calls.create_flight(
                startCity,
                endCity,
                time,
                cost
            )
            res.status(200).send(
                'Flight (' +
                    startCity +
                    ')-[time: ' +
                    flight.time +
                    ' cost: ' +
                    flight.cost +
                    ']->(' +
                    endCity +
                    ') created.'
            )
        } else {
            console.log('Insufficent permissions!')
            res.status(200).send({ error: 'Insufficent permissions!' })
        }
        return 700000
    }
)

router.get('/neo4j_get_flight_by_time/', async function (req, res, next) {
    let { startCity, endCity } = req.query
    let result = await neo4j_calls.get_flight_by_time(startCity, endCity)
    console.log('Flight by time query:')
    console.log('startCity: ' + startCity)
    console.log('endCity: ' + endCity)
    res.status(200).send(result)
    return { result }
})

router.get('/neo4j_get_flight_by_cost/', async function (req, res, next) {
    let { startCity, endCity } = req.query
    let result = await neo4j_calls.get_flight_by_cost(startCity, endCity)
    console.log('Flight by cost query:')
    console.log('startCity: ' + startCity)
    console.log('endCity: ' + endCity)
    res.status(200).send(result)
    return { result }
})
module.exports = router
