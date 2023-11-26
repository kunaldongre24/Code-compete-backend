const passport = require("passport");
const jwt = require("jsonwebtoken");

exports.COOKIE_OPTIONS = {
  secure: true,
  signed: true,
  maxAge: eval(process.env.MANAGER_REFRESH_TOKEN_EXPIRY) * 1000,
  sameSite: "None",
  domain: ".fly247.in",
};

exports.getManagerRefreshToken = (user) => {
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: eval(process.env.MANAGER_REFRESH_TOKEN_EXPIRY),
  });
  return refreshToken;
};

exports.verifyUser = passport.authenticate("jwt", { session: false });
