const mongoose = require("mongoose"); // Erase if already required

var Tags = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

//Export the model

module.exports = mongoose.model("Tags", Tags);
