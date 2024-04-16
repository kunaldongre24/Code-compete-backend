const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/User");

passport.use(
  new LocalStrategy(
    {
      usernameField: "username", // 'login' can be either email or username
      passwordField: "password",
    },
    async function (login, password, done) {
      try {
        const user = await User.findOne({
          $or: [{ email: login }, { username: login }],
        });
        if (!user) {
          return done(null, false, { message: "Incorrect username or email." });
        }
        if (!user.verifyPassword(password)) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

module.exports = passport;
