const mongoose = require("mongoose");

var matchListSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
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
  marketId: {
    type: String,
    required: true,
  },
  runnerId1: {
    type: String,
    required: true,
  },
  runnerName1: {
    type: String,
    required: true,
  },
  runnerId2: {
    type: String,
    required: true,
  },
  runnerName2: {
    type: String,
    required: true,
  },
  marketStartTime: {
    type: Date,
    required: true,
  },
  matchStatus: {
    type: String,
    required: true,
  },
  gameId: {
    type: String,
    required: true,
  },

  marketId: {
    type: String,
    required: true,
  },
  runnerArray: {
    type: Array,
    required: false,
  },
  settled: {
    type: Boolean,
    required: false,
  },
  winnerSid: {
    type: String,
    required: false,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

module.exports = mongoose.model("MatchList", matchListSchema);
