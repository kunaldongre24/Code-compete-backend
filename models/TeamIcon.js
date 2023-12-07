const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teamIconSchema = new Schema({
  teamName: { type: String, required: true },
  imageUrl: { type: String, required: true },
  lastUpdate: { type: Date, default: Date.now, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("TeamIcon", teamIconSchema);
