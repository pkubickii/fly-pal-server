const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.use(cors());

let api = require("./routes/api");

//Sending a GET to localhost:8080/dummy should return this
app.get("/dummy", (req, res) =>
  res.send("Response from Route of the Express Server!!")
);

app.listen(8080);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//
app.use("/api", api);

console.log("Server running on 8080...");

app.use(express.static("./public/index.html"));

module.exports = app;
