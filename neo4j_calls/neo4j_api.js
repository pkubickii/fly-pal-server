let neo4j = require('neo4j-driver')
let { creds } = require('./../config/credentials')
let driver = neo4j.driver(
    'bolt://0.0.0.0:7687',
    neo4j.auth.basic(creds.neo4jusername, creds.neo4jpw)
)
const formatNeoResult = (neoResults) => {
    const result = []
    neoResults.records.forEach((record) => {
        record._fields.forEach((field) => {
            result.push({
                country: field.properties.country,
                name: field.properties.name,
                lat: field.properties.lat,
                lng: field.properties.lng,
            })
        })
    })
    return result
}
exports.get_num_nodes = async function () {
    let session = driver.session()
    const num_nodes = await session.run('MATCH (n) RETURN n', {})
    session.close()
    console.log('Number of nodes:', !num_nodes ? 0 : num_nodes.records.length)
    return !num_nodes ? 0 : num_nodes.records.length
}

exports.get_all_cities = async function () {
    let session = driver.session()
    const result_cities = await session.run('MATCH (city:City) RETURN city', {})
    session.close()
    const result = []
    result_cities.records.forEach((record) => {
        record._fields.forEach((field) => {
            result.push({
                country: field.properties.country,
                name: field.properties.name,
                lat: field.properties.lat,
                lng: field.properties.lng,
            })
        })
    })
    return !result_cities ? [] : result
}

exports.get_flight_by_time = async function (startCity, endCity) {
    let session = driver.session()
    const result_cities = await session.run(
        "MATCH (source:City {name: $prop1}), (target:City {name: $prop2}) CALL gds.shortestPath.yens.stream('flightByTimeGraph', { sourceNode: source, targetNode: target, k: 3, relationshipWeightProperty: 'time' }) YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path RETURN index, gds.util.asNode(sourceNode).name AS sourceNodeName, gds.util.asNode(targetNode).name AS targetNodeName, totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames, costs, nodes(path) as path ORDER BY index",
        {
            prop1: startCity,
            prop2: endCity,
        }
    )
    session.close()
    const field_result = result_cities.records.map((record) => {
        return {
            names: record._fields[record._fieldLookup.nodeNames],
            cost: record._fields[record._fieldLookup.totalCost],
            path: record._fields[record._fieldLookup.path].map(
                (path) => path.properties
            ),
        }
    })

    return !result_cities ? [] : field_result
}

exports.get_flight_by_cost = async function (startCity, endCity) {
    let session = driver.session()
    const result_cities = await session.run(
        "MATCH (source:City {name: $prop1}), (target:City {name: $prop2}) CALL gds.shortestPath.yens.stream('flightByCostGraph', { sourceNode: source, targetNode: target, k: 3, relationshipWeightProperty: 'cost' }) YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path RETURN index, gds.util.asNode(sourceNode).name AS sourceNodeName, gds.util.asNode(targetNode).name AS targetNodeName, totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames, costs, nodes(path) as path ORDER BY index",
        {
            prop1: startCity,
            prop2: endCity,
        }
    )
    session.close()
    const field_result = result_cities.records.map((record) => {
        return {
            names: record._fields[record._fieldLookup.nodeNames],
            cost: record._fields[record._fieldLookup.totalCost],
            path: record._fields[record._fieldLookup.path].map(
                (path) => path.properties
            ),
        }
    })

    return !result_cities ? [] : field_result
}

exports.create_user = async function (username, email, passwd) {
    let session = driver.session()
    let user = { error: 'Error creating user!' }
    try {
        user = await session.run(
            "MATCH (r:Role) WHERE r.role = 'user' CREATE (u:User {name: $prop1, email: $prop2, passwd: $prop3}), (u)-[:HASROLE]->(r) RETURN u,r",
            {
                prop1: username,
                prop2: email,
                prop3: passwd,
            }
        )
    } catch (err) {
        console.error(err)
        return user
    }
    console.log('Registered user: ', user.records[0].get(0).properties)
    console.log('Role: ', user.records[0].get(1).properties.role)
    logged = user.records[0].get(0).properties
    role = user.records[0].get(1).properties.role
    logged.role = role
    return logged
}

exports.login_user = async (email, passwd) => {
    let session = driver.session()
    let user = {}
    try {
        user = await session.run(
            'MATCH (u:User {email: $prop1})-[:HASROLE]->(r:Role) RETURN u,r',
            {
                prop1: email,
            }
        )
    } catch (err) {
        console.error(err)
        return { error: 'Neo4j error! Bad request!' }
    }
    if (user.records.length > 0) {
        console.log('Logged in:', user.records[0].get(0).properties)
        console.log('Role: ', user.records[0].get(1).properties.role)
        logged = user.records[0].get(0).properties
        role = user.records[0].get(1).properties.role
        logged.role = role
        return logged
    } else {
        return { error: "User doesn't exist!" }
    }
}

exports.create_city = async function (country, name, lat, lng) {
    let session = driver.session()
    let city = 'No Country For Old Man'
    try {
        city = await session.run(
            'CREATE (city:City {country: $prop1, name: $prop2, lat: $prop3, lng: $prop4}) RETURN city',
            {
                prop1: country,
                prop2: name,
                prop3: lat,
                prop4: lng,
            }
        )
    } catch (err) {
        console.error(err)
        return city
    }
    return city.records[0].get(0).properties.name
}

exports.create_flight = async function (startCity, endCity, time, cost) {
    let session = driver.session()
    let flight = 'No Flight Zone'
    try {
        flight = await session.run(
            'MATCH (sc: City), (ec: City) WHERE sc.name = $prop1 AND ec.name = $prop2 CREATE (sc)-[flight:FLIGHT { time: $prop3, cost: $prop4 }]->(ec) RETURN flight',
            {
                prop1: startCity,
                prop2: endCity,
                prop3: time,
                prop4: cost,
            }
        )
    } catch (err) {
        console.error(err)
        return city
    }
    return flight.records[0].get(0).properties
}
