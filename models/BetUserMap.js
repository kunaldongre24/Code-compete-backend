const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const betUserMapSchema = new Schema({
  adminShare: { type: Number, required: true },
  betId: { type: String, required: false },
  commissionPercentage: { type: Number, required: false },
  myCom: { type: Number, required: false },
  comAmount: { type: Number, required: false },
  sessionCommission: { type: Number, required: false },
  sessionComPerc: { type: Number, required: false },
  company: { type: String, required: true },
  lossAmount: { type: Number, required: true },
  profitAmount: { type: Number, required: true },
  fancyName: { type: String, required: false },
  name: { type: String, required: true },
  isBack: { type: Boolean, required: true },
  isLay: { type: Boolean, required: true },
  runnerArray: { type: Array, required: false },
  matchId: { type: String, required: true },
  matchname: { type: String, required: true },
  result: { type: Number, required: false },
  odds: { type: Number, required: true },
  pname: { type: String, required: true },
  priceValue: { type: Number, required: true },
  selectionName: { type: String, required: false },
  selectionId: { type: String, required: false },
  settled: { type: Boolean, default: false, required: true },
  sportId: { type: Number, default: 4, required: true },
  winner: { type: String, required: false },
  stake: { type: Number, required: true },
  player: { type: String, required: true },
  won: { type: Boolean, default: false, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});
module.exports = mongoose.model("BetUserMap", betUserMapSchema);
