const mongoose = require("mongoose");

var RaceProblemsetMap = new mongoose.Schema({
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
  finished: {
    type: Boolean,
    default: false,
  },
  createdOn: { type: Date, default: Date.now, required: true },
  lastUpdated: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("RaceProblemsetMap", RaceProblemsetMap);
