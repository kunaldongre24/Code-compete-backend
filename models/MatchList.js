const mongoose = require("mongoose");

var matchListSchema = new mongoose.Schema({
  sportId: {
    type: String,
    required: true,
  },
  eventId: {
    type: String,
    required: true,
  },
  eventName: {
    type: String,
    required: true,
  },
  markets: {
    type: Object,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  settled: {
    type: Boolean,
    default: false,
  },
  winnerSid: {
    type: String,
    required: false,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    required: true,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

matchListSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("MatchList", matchListSchema);
