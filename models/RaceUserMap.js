const mongoose = require("mongoose");

var RaceUserMap = new mongoose.Schema({
  raceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Race",
    required: true,
  },
  problemSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProblemSet",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isSolved: {
    type: Boolean,
    default: false,
  },
  isFinished: {
    type: Boolean,
    default: false,
  },
  createdOn: { type: Date, default: Date.now, required: true },
  lastUpdated: { type: Date, default: Date.now, required: true },
});

//Export the model

module.exports = mongoose.model("RaceUserMap", RaceUserMap);
