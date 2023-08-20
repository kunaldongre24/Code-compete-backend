const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const matchUserMapSchema = new Schema({
  company: { type: String, required: true },
  matchId: { type: String, required: true },
  matchname: { type: String, required: true },
  sid: { type: String, required: true },
  sum: { type: Number, required: true },
  total: { type: Number, required: true },
  type: { type: String, required: true },
  winnerSid: { type: String, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("MatchUserMap", matchUserMapSchema);
