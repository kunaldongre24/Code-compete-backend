const mongoose = require("mongoose"); // Erase if already required
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const Session = new Schema({
  refreshToken: {
    type: String,
    default: "",
  },
});

var User = new mongoose.Schema({
  companyId: {
    type: String,
    required: false,
  },
  level: {
    type: Number,
    required: true,
  },
  matchCommission: {
    type: Number,
    required: true,
    default: 0,
  },
  authStrategy: {
    type: String,
    default: "local",
  },
  refreshToken: {
    type: [{ refreshToken: String }],
  },
  currentSession: { type: String },
  matchShare: {
    type: Number,
    required: true,
    default: 0,
  },
  name: {
    type: String,
    required: true,
  },
  sessionCommission: {
    type: Number,
    required: true,
    default: 0,
  },
  totalCoins: {
    type: Number,
    required: true,
    default: 0,
  },
  username: {
    type: String,
    required: true,
    unique: true,
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
