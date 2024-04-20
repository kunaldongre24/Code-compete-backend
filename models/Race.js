const mongoose = require("mongoose"); // Erase if already required

var Race = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },

  members: {
    type: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isSpectator: {
          type: Boolean,
          required: true,
        },
      },
    ],
    required: true,
  },
  maxRating: { type: Number, required: true },
  minRating: {
    type: Number,
    required: true,
  },
  problemSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProblemSet",
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
