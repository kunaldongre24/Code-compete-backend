const mongoose = require("mongoose"); // Erase if already required

var Room = new mongoose.Schema({
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },
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

module.exports = mongoose.model("Room", Room);
