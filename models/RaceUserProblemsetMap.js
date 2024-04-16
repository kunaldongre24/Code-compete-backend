const mongoose = require("mongoose");

var RaceUserProblemsetMap = new mongoose.Schema({
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
  solveTimeMs: {
    type: Number,
  },
  code: {
    type: String,
    required: true,
    default:
      "#include<iostream>\nusing namespace std;\nint main(){\n\n  return 0;\n}",
  },
  pos: { from: Number, to: Number },
  solved: {
    type: Boolean,
    default: false,
  },
  finished: {
    type: Boolean,
    default: false,
  },
  startingTime: { type: Date, default: Date.now, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
  lastUpdated: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("RaceUserProblemsetMap", RaceUserProblemsetMap);
