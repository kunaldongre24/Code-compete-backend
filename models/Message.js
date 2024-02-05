const mongoose = require("mongoose"); // Erase if already required

var Message = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
    },
    roomId: {
      type: "String",
    },
    type: {
      type: String,
      default: "text",
    },
    isCritical: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model

module.exports = mongoose.model("Message", Message);
