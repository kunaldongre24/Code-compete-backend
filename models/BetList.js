const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const betListSchema = new Schema({
  fancyName: { type: String, required: true },
  value: { type: String, required: true },
  matchId: { type: String, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("BetList", betListSchema);
