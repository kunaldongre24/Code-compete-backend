const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PushNotification = new Schema({
  user_id: { type: String, required: true },
  fcm_token: { type: String, required: true, unique: true },
  lastUpdated: { type: Date, default: Date.now, require: false },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("push_notification", PushNotification);
