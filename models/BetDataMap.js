const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const betDataMapSchema = new Schema({
  fancyName: { type: String, required: true },
  isBack: { type: Boolean, required: true },
  isLay: { type: Boolean, required: true },
  matchId: { type: String, required: true },
  matchname: { type: String, required: true },
  odds: { type: Number, required: true },
  pname: { type: String, required: true },
  priceValue: { type: String, required: true },
  result: { type: String, required: false },
  settled: { type: Boolean, default: false, required: true },
  sportId: { type: Number, default: 4, required: true },
  transactionId: { type: String, required: true },
  stake: { type: Number, required: true },
  userId: { type: String, required: true },
  won: { type: Boolean, default: false, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("BetDataMap", betDataMapSchema);
