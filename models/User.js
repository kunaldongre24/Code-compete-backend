const mongoose = require("mongoose"); // Erase if already required
const passportLocalMongoose = require("passport-local-mongoose");

var User = new mongoose.Schema({
  role: {
    type: String,
    required: true,
  },
  authStrategy: {
    type: String,
    default: "local",
    required: true,
  },
  refreshToken: {
    type: [{ refreshToken: String }],
  },
  currentSession: { type: String },
  profile_url: {
    type: String,
  },
  email: { type: String, required: true, unique: true },
  rating: {
    type: Number,
    required: true,
    default: 0,
  },
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  verified: {
    type: Boolean,
    required: true,
    default: false,
  },

  createdOn: { type: Date, default: Date.now, required: true },
});

User.set("toJSON", {
  transform: function (doc, ret, options) {
    delete ret.refreshToken;
    return ret;
  },
});
User.plugin(passportLocalMongoose);
//Export the model
module.exports = mongoose.model("User", User);
