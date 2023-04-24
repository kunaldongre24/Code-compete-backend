const mongoose = require("mongoose");

var matchListSchema = new mongoose.Schema({
  back1: {
    type: Number,
    required: true,
  },
  back11: {
    type: Number,
    required: true,
  },
  back12: {
    type: Number,
    required: true,
  },
  lay1: {
    type: Number,
    required: true,
  },
  lay11: {
    type: Number,
    required: true,
  },
  lay12: {
    type: Number,
    required: true,
  },
  eid: {
    type: String,
    required: true,
  },
  eventName: {
    type: String,
    required: true,
  },
  f: {
    type: String,
    required: true,
  },
  gameId: {
    type: String,
    required: true,
  },
  inPlay: {
    type: String,
    required: true,
  },
  m1: {
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
  tv: {
    type: String,
    required: true,
  },
  vir: {
    type: Number,
    required: false,
  },
  winnerSid: {
    type: Number,
    required: false,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

module.exports = mongoose.model("MatchList", matchListSchema);
