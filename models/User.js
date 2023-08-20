const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
  },
  level: {
    type: Number,
    required: true,
  },
  matchCommission: {
    type: Number,
    required: true,
    default: 0,
  },
  matchShare: {
    type: Number,
    required: true,
    default: 0,
  },
  name: {
    type: String,
    required: true,
  },
  sessionCommission: {
    type: Number,
    required: true,
    default: 0,
  },
  totalCoins: {
    type: Number,
    required: true,
    default: 0,
  },
  uid: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  createdOn: { type: Date, default: Date.now, required: true },
});

//Export the model
module.exports = mongoose.model("User", userSchema);
