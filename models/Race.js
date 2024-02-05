const mongoose = require("mongoose"); // Erase if already required

var Race = new mongoose.Schema({
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  problemSets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProblemSet",
    },
  ],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
  },
  roomId: {
    type: String,
    required: true,
  },
  createdOn: { type: Date, default: Date.now, required: true },
  lastUpdated: { type: Date, default: Date.now, required: true },
});

//Export the model

module.exports = mongoose.model("Room", Race);
