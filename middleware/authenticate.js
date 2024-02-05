const passport = require("passport");
const jwt = require("jsonwebtoken");

exports.COOKIE_OPTIONS = {
  signed: true,
  httpOnly: true,
  maxAge: eval(process.env.REFRESH_TOKEN_EXPIRY) * 1000,
};

exports.getRefreshToken = (user) => {
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: eval(process.env.REFRESH_TOKEN_EXPIRY),
  });
  return refreshToken;
};

exports.verifyUser = passport.authenticate("jwt", { session: false });
