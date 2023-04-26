const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ledgerSchema = new Schema({
  setterPreviousLimit: { type: Number, required: true },
  getterPreviousLimit: { type: Number, required: true },
  value: { type: Number, required: true },
  note: { type: String, default: "", require: true },
  setter: { type: String, required: true },
  getter: { type: String, required: true },
  createdOn: { type: Number, required: true },
});

module.exports = mongoose.model("Ledger", ledgerSchema);
