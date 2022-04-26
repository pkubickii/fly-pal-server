let neo4j = require("neo4j-driver");
let { creds } = require("./../config/credentials");
let driver = neo4j.driver(
  "bolt://0.0.0.0:7687",
  neo4j.auth.basic(creds.neo4jusername, creds.neo4jpw)
);
const formatNeoResult = (neoResults) => {
  const result = [];
  neoResults.records.forEach((record) => {
    record._fields.forEach((field) => {
      result.push({
        country: field.properties.country,
        name: field.properties.name,
        lat: field.properties.lat,
        lng: field.properties.lng,
      });
    });
  });
  return result;
};
exports.get_num_nodes = async function () {
  let session = driver.session();
  const num_nodes = await session.run("MATCH (n) RETURN n", {});
  session.close();
  console.log("RESULT", !num_nodes ? 0 : num_nodes.records.length);
  return !num_nodes ? 0 : num_nodes.records.length;
};

exports.get_all_cities = async function () {
  let session = driver.session();
  const result_cities = await session.run("MATCH (city:City) RETURN city", {});
  session.close();
  const result = [];
  result_cities.records.forEach((record) => {
    record._fields.forEach((field) => {
      result.push({
        country: field.properties.country,
        name: field.properties.name,
        lat: field.properties.lat,
        lng: field.properties.lng,
      });
    });
  });
  return !result_cities ? [] : result;
};

exports.get_flight = async function (startCity, endCity) {
  let session = driver.session();
  const result_cities = await session.run(
    "MATCH (source:City {name: $prop1}), (target:City {name: $prop2}) CALL gds.shortestPath.yens.stream('citiesGraph', { sourceNode: source, targetNode: target, k: 3, relationshipWeightProperty: 'time' }) YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path RETURN index, gds.util.asNode(sourceNode).name AS sourceNodeName, gds.util.asNode(targetNode).name AS targetNodeName, totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames, costs, nodes(path) as path ORDER BY index",
    {
      prop1: startCity,
      prop2: endCity,
    }
  );
  session.close();
  const field_result = result_cities.records.map((record) => {
    return {
      names: record._fields[record._fieldLookup.nodeNames],
      cost: record._fields[record._fieldLookup.totalCost],
      path: record._fields[record._fieldLookup.path].map(
        (path) => path.properties
      ),
    };
  });

  return !result_cities ? [] : field_result;
};

exports.create_user = async function (name, email, passwd) {
  let session = driver.session();
  let user = "No User Was Created";
  try {
    user = await session.run(
      "MERGE (n:User {name: $prop1, email: $prop2, passwd: $prop3}) RETURN n",
      {
        prop1: name,
        prop2: email,
        prop3: passwd,
      }
    );
  } catch (err) {
    console.error(err);
    return user;
  }
  return user.records[0].get(0).properties.name;
};

exports.create_city = async function (country, name, lat, lng) {
  let session = driver.session();
  let city = "No Country For Old Man";
  try {
    city = await session.run(
      "MERGE (nn:City {country: $prop1, name: $prop2, lat: $prop3, lng: $prop4}) RETURN nn",
      {
        prop1: country,
        prop2: name,
        prop3: lat,
        prop4: lng,
      }
    );
  } catch (err) {
    console.error(err);
    return city;
  }
  return city.records[0].get(0).properties.name;
};
