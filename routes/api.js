const express = require("express");
const router = express.Router();
const neo4j_calls = require("../neo4j_calls/neo4j_api");
const bcrypt = require("bcrypt");
const saltRounds = 10;

router.get("/", async function (req, res, next) {
  res.status(200).send("Root Response from FlyPal Server @ :8080/api");
  return 700000;
});

router.get("/neo4j_get", async function (req, res, next) {
  let result = await neo4j_calls.get_num_nodes();
  res.status(200).send({ result }); //Can't send just a Number; encapsulate with {} or convert to String.
  return { result };
});

router.get("/neo4j_get_cities", async function (req, res, next) {
  let result = await neo4j_calls.get_all_cities();
  res.status(200).send(result);
  return { result };
});

router.post("/register", function (req, res, next) {
  let { username, email, passwd } = req.body;

  bcrypt.hash(passwd, saltRounds, async (err, hash) => {
    if (err) {
      console.log(err);
    }
    let user = await neo4j_calls.create_user(username, email, hash);
    console.log('user', user);
    const { passwd, ...userNoPass } = user;
    console.log('userNoPass', userNoPass);
    res.status(200).send(userNoPass);
  });
  return 700000;
});

router.post("/login", async (req, res) => {
  let { email, passwd } = req.body;
  let user = await neo4j_calls.login_user(email);

  if (!user.error) {
    bcrypt.compare(passwd, user.passwd, (err, result) => {
      if (result) {
        const { passwd, ...userNoPass } = user;
        res.status(200).send(userNoPass);
      } else {
        res.status(200).send({ error: "Bad password!" });
      }
    });
  } else {
    return res.status(200).send(user);
  }
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
    console.log("ZAPYTANIE*");
    console.log("startCity: " + req.params.startCity);
    console.log("endCity: " + req.params.endCity);
    res.status(200).send(result);
    return { result };
  }
);

module.exports = router;
