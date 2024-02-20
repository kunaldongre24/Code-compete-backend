const mongoose = require("mongoose"); // Erase if already required

var Race = new mongoose.Schema({
  problemSets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProblemSet",
    },
  ],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  tpp: { type: Number, required: true },
  maxRating: { type: Number, required: true },
  minRating: {
    type: Number,
    required: true,
  },
  isFinished: {
    type: Boolean,
    default: false,
  },
  createdOn: { type: Date, default: Date.now, required: true },
  lastUpdated: { type: Date, default: Date.now, required: true },
});

//Export the model

module.exports = mongoose.model("Race", Race);
