const mongoose = require("mongoose"); // Erase if already required

var UserOTPVerification = new mongoose.Schema({
  userId: { type: String, required: true },
  uniqueString: { type: String, required: true },
  expiresOn: { type: Date, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

//Export the model

module.exports = mongoose.model("UserOtpVerification", UserOTPVerification);
