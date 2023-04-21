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
  },
  matchShare: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sessionCommission: {
    type: Number,
    required: true,
  },
  totalCoins: {
    type: Number,
    required: true,
  },
  uid: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
});

//Export the model
module.exports = mongoose.model("User", userSchema);
