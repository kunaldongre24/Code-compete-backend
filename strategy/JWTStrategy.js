const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const User = require("../models/User");

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.REFRESH_TOKEN_SECRET;

passport.use(
  new JwtStrategy(opts, function (jwt_payload, done) {
    // Find the user by _id in the JWT payload
    User.findOne({ _id: jwt_payload._id })
      .then((user) => {
        if (user) {
          return done(null, user);
        } else {
          return done(null, false, {
            message: "Incorrect username or password!",
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return done(err, false);
      });
  })
);
