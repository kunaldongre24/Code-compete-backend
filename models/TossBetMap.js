const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tossBetSchema = new Schema({
  isBack: { type: Boolean, required: true },
  isLay: { type: Boolean, required: true },
  matchId: { type: String, required: true },
  matchname: { type: String, required: true },
  odds: { type: Number, required: true },
  priceValue: { type: Number, required: true },
  pname: { type: String, required: true },
  runnerArray: { type: Array, required: true },
  selectionId: { type: String, required: true },
  selectionName: { type: String, required: true },
  settled: { type: Boolean, default: false, required: true },
  sportId: { type: Number, required: true },
  stake: { type: Number, required: true },
  transactionId: { type: String, required: true },
  userId: { type: String, required: true },
  winner: { type: String, required: false },
  won: { type: Boolean, required: false },
  time: { type: Date, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});
const TossBet = mongoose.model("tossBetMap", tossBetSchema);
module.exports = TossBet;
