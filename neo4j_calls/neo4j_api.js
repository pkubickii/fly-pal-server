let neo4j = require('neo4j-driver')
let {creds} = require('./../config/credentials')
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

exports.graphs_drop = async function () {
    let session = driver.session()
    const result = {data: 'Graphs dropped'}

    try {
        drop_time = await session.run(
            "CALL gds.graph.drop('flightByTimeGraph') YIELD graphName;",
            {}
        )
        drop_cost = await session.run(
            "CALL gds.graph.drop('flightByCostGraph') YIELD graphName;",
            {}
        )
    } catch (err) {
        console.log('No graphs to drop')
        return {error: err}
    }
    session.close()
    console.log('Graphs dropped.')
    return result
}

exports.load_database = async function () {
    let session = driver.session()
    const fs = require('fs');
    let dbCreationScript
    fs.readFile('config/dbCreation.cy', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        dbCreationScript = data
        // console.log(data);
    });


    const result = {}

    try {
        await session.run(
            "MATCH (n) DETACH DELETE n;",
            {}
        )
        await session.run(
            "CREATE" +
            "(r1:Role { role: 'user'})," +
            "(r2:Role { role: 'admin'});",
            {}
        )
        await session.run(
            "MATCH (r:Role) WHERE r.role = 'admin' CREATE (u:User {name: 'admin', email: 'admin@admin.ad', passwd: '$2b$10$ar3vgdJNWlpf3n/RTOaYUu/5Nn36IZurU9nDz4ofRzUXwSJgBSDQW'}), (u)-[:HASROLE]->(r) RETURN u,r",
            {}
        )
        await session.run(
            dbCreationScript,
            {}
        )
    } catch (err) {
        console.error(err)
        return {error: err}
    }
    session.close()
    console.log('DB created.')
    return result
}

exports.graphs_create = async function () {
    let session = driver.session()
    const result = {}

    try {
        create_graph_time = await session.run(
            "CALL gds.graph.project('flightByTimeGraph', 'City', 'FLIGHT', { relationshipProperties: 'time' });",
            {}
        )
        create_graph_cost = await session.run(
            "CALL gds.graph.project('flightByCostGraph', 'City', 'FLIGHT', { relationshipProperties: 'cost' });",
            {}
        )
    } catch (err) {
        console.error(err)
        return {error: err}
    }
    session.close()
    console.log('Graphs created.')
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
        "MATCH (source:City {name: $prop1}), (target:City {name: $prop2}) CALL gds.shortestPath.yens.stream('flightByTimeGraph', { sourceNode: source, targetNode: target, k: 5, relationshipWeightProperty: 'time' }) YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path RETURN index, gds.util.asNode(sourceNode).name AS sourceNodeName, gds.util.asNode(targetNode).name AS targetNodeName, totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames, [nodeId IN nodeIds | gds.util.asNode(nodeId).iataCode] AS iataCodes, costs, nodes(path) as path ORDER BY index",
        {
            prop1: startCity,
            prop2: endCity,
        }
    )
    session.close()
    const field_result = result_cities.records.map((record) => {
        return {
            names: record._fields[record._fieldLookup.nodeNames],
            codes: record._fields[record._fieldLookup.iataCodes],
            cost: record._fields[record._fieldLookup.totalCost],
            path: record._fields[record._fieldLookup.path].map(
                (path) => path.properties
            ),
        }
    })
    const result = await append_alt_costs(field_result, 'cost')

    return !result_cities ? [] : result
}

exports.get_flight_by_cost = async function (startCity, endCity) {
    let session = driver.session()
    const result_cities = await session.run(
        "MATCH (source:City {name: $prop1}), (target:City {name: $prop2}) CALL gds.shortestPath.yens.stream('flightByCostGraph', { sourceNode: source, targetNode: target, k: 5, relationshipWeightProperty: 'cost' }) YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path RETURN index, gds.util.asNode(sourceNode).name AS sourceNodeName, gds.util.asNode(targetNode).name AS targetNodeName, totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames, [nodeId IN nodeIds | gds.util.asNode(nodeId).iataCode] AS iataCodes, costs, nodes(path) as path ORDER BY index",
        {
            prop1: startCity,
            prop2: endCity,
        }
    )
    session.close()
    const field_result = result_cities.records.map((record) => {
        return {
            names: record._fields[record._fieldLookup.nodeNames],
            codes: record._fields[record._fieldLookup.iataCodes],
            cost: record._fields[record._fieldLookup.totalCost],
            path: record._fields[record._fieldLookup.path].map(
                (path) => path.properties
            ),
        }
    })
    const result = await append_alt_costs(field_result, 'time')

    return !result_cities ? [] : result
}

const append_alt_costs = async (field_result, factor) => {
    let codesArr = field_result.map((res) => res.codes)
    let queriesArr = codesArr.map((codes) =>
        get_queries_for_alt_costs(codes, factor)
    )
    let sumPromises = queriesArr.map(async (queries) => get_alt_costs(queries))
    let altCosts = await Promise.all(sumPromises)
        .then((sums) => sums)
        .catch((err) => console.log(err))
    for (let i = 0; i < field_result.length; i++) {
        field_result[i].altCost = altCosts[i]
    }

    return field_result
}

const get_alt_costs = async function (queries) {
    let countsPromises = queries.map((query) => {
        return get_alt_cost(query)
    })
    let result = Promise.all(countsPromises)
        .then((counts) => {
            let sum = 0
            counts.forEach((count) => (sum += count))
            return sum
        })
        .catch((err) => console.log(err))

    return result
}

const get_alt_cost = async function (query) {
    let session = driver.session()
    const result = await session.run(query)
    session.close()
    let res =
        result.records[0]._fields[result.records[0]._fieldLookup.altCost].low

    return !result ? [] : res
}

const get_queries_for_alt_costs = (codes, factor) => {
    let queries = []
    for (let i = 0; i < codes.length - 1; i++) {
        queries.push(
            `MATCH (sc:City)-[f:FLIGHT]->(ec:City) WHERE sc.iataCode = '${
                codes[i]
            }' AND ec.iataCode = '${
                codes[i + 1]
            }' return f.${factor} AS altCost`
        )
    }

    return queries
}

exports.create_user = async function (username, email, passwd) {
    let session = driver.session()
    let user = {error: 'Error creating user!'}
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
        return {error: 'Neo4j error! Bad request!'}
    }
    if (user.records.length > 0) {
        console.log('Logged in:', user.records[0].get(0).properties)
        console.log('Role: ', user.records[0].get(1).properties.role)
        logged = user.records[0].get(0).properties
        role = user.records[0].get(1).properties.role
        logged.role = role
        return logged
    } else {
        return {error: "User doesn't exist!"}
    }
}

exports.create_city = async function (iataCode, name, lat, lng) {
    let session = driver.session()
    let city = {error: 'Error creating city!'}
    try {
        city = await session.run(
            'CREATE (city:City {iataCode: $prop1, name: $prop2, lat: $prop3, lng: $prop4}) RETURN city',
            {
                prop1: iataCode,
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

exports.create_flight = async function (
    startCity,
    endCity,
    distance,
    time,
    cost
) {
    let session = driver.session()
    let flight = {error: 'Error creating flight!'}
    try {
        flight = await session.run(
            'MATCH (sc: City), (ec: City) WHERE sc.name = $prop1 AND ec.name = $prop2 CREATE (sc)-[flight:FLIGHT { distance: toInteger($prop3), time: toInteger($prop4), cost: toInteger($prop5) }]->(ec) RETURN flight',
            {
                prop1: startCity,
                prop2: endCity,
                prop3: +distance,
                prop4: +time,
                prop5: +cost,
            }
        )
    } catch (err) {
        console.error(err)
        return flight
    }
    return flight.records[0].get(0).properties
}
