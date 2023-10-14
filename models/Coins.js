const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CoinSchema = new Schema({
  getter: { type: String, required: false },
  setter: { type: String, required: false },
  getterPreviousLimit: { type: Number, required: false },
  setterPreviousLimit: { type: Number, required: false },
  selectionName: { type: String, required: false },
  type: { type: Number, required: true },
  value: { type: Number, required: true },
  msg: { type: String, default: "-", required: true },
  betId: { type: String },
  matchId: { type: String, required: false },
  newArr: { type: Array, required: false },
  lastUpdated: { type: Date, default: Date.now, require: false },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("Coin", CoinSchema);
