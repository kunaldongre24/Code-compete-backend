const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commissionSchema = new Schema({
  getter: { type: String, required: false },
  setter: { type: String, required: false },
  getterPreviousLimit: { type: String, required: false },
  setterPreviousLimit: { type: String, required: false },
  matchShare: { type: Number, required: false },
  sessionCommission: { type: Number, required: true },
  matchCommission: { type: Number, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

const Commission = mongoose.model("Commission", commissionSchema);

module.exports = Commission;
