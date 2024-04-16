const mongoose = require("mongoose");

var RoomUserMap = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  socketId: {
    type: String,
    required: true,
    unique: true,
  },
  isReady: {
    type: Boolean,
    required: true,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  isSpectator: {
    type: Boolean,
    required: true,
    default: false,
  },
  isMuted: {
    type: Boolean,
    required: true,
    default: false,
  },
  createdOn: { type: Date, default: Date.now, required: true },
  lastUpdated: { type: Date, default: Date.now, required: true },
});

//Export the model

module.exports = mongoose.model("RoomUserMap", RoomUserMap);
