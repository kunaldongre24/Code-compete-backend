const mongoose = require("mongoose");

const countSchema = mongoose.Schema({
  count: { type: Number, required: true },
  name: { type: String, required: true },
});

module.exports = mongoose.model("Count", countSchema);
