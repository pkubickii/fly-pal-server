const { sign, verify, decode } = require("jsonwebtoken");

const createToken = (user) => {
  const accessToken = sign(
    { username: user.name, email: user.email },
    "jwthardcodedsecretlol"
  );

  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.cookies["flypal-token"];

  if (!accessToken)
    return res.status(400).json({ error: "User not Authenticated!" });

  try {
    const validToken = verify(accessToken, "jwthardcodedsecretlol");
    if (validToken) {
      var deco = decode(accessToken, { complete: true });
      console.log(deco.header);
      console.log(deco.payload);
      req.authenticated = true;
      next();
    }
  } catch (err) {
    return res.status(400).json({ error: err });
  }
};

module.exports = { createToken, validateToken };
