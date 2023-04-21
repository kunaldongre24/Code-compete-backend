const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CoinSchema = new Schema({
  getter: { type: String, required: false },
  setter: { type: String, required: false },
  getterPreviousLimit: { type: String, required: false },
  setterPreviousLimit: { type: String, required: false },
  type: { type: Number, required: true },
  value: { type: Number, required: true },
  msg: { type: String, default: "-", required: true },
  matchId: { type: String, required: false },
  createdOn: { type: Date, default: Date.now(), required: true },
});

module.exports = mongoose.model("Coin", CoinSchema);
