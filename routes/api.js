const express = require("express");
const router = express.Router();
const neo4j_calls = require("../neo4j_calls/neo4j_api");

router.get("/", async function (req, res, next) {
  res.status(200).send("Root Response from FlyPal Server @ :8080/api");
  return 700000;
});

router.get("/neo4j_get", async function (req, res, next) {
  let result = await neo4j_calls.get_num_nodes();
  console.log("Number of nodes from /neo4j_get: ", result);
  res.status(200).send({ result }); //Can't send just a Number; encapsulate with {} or convert to String.
  return { result };
});

router.get("/neo4j_get_cities", async function (req, res, next) {
  let result = await neo4j_calls.get_all_cities();
  res.status(200).send({ result });
  return { result };
});

router.post("/neo4j_post_user", async function (req, res, next) {
  let { name, email, passwd } = req.body;
  let string = await neo4j_calls.create_user(name, email, passwd);
  res.status(200).send("User named " + string + " created");
  return 700000;
});

router.post("/neo4j_post_city", async function (req, res, next) {
  let { country, name, lat, lng } = req.body;
  let string = await neo4j_calls.create_city(country, name, lat, lng);
  res.status(200).send("City " + string + " created");
  return 700000;
});

router.get(
  "/neo4j_get_flight/:startCity-:endCity",
  async function (req, res, next) {
    let result = await neo4j_calls.get_flight(
      req.params.startCity,
      req.params.endCity
    );
    res.status(200).send({ result });
    return { result };
  }
);

module.exports = router;
