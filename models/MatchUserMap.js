const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const matchUserMapSchema = new Schema({
  company: { type: String, required: true },
  matchId: { type: String, required: true },
  matchName: { type: String, required: true },
  sid: { type: Number, required: true },
  sum: { type: Number, required: true },
  total: { type: Number, required: true },
  type: { type: String, required: true },
  winner: { type: String, required: true },
  createdOn: { type: Date, default: Date.now(), required: true },
});

module.exports = mongoose.model("MatchUserMap", matchUserMapSchema);
