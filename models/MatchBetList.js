const mongoose = require("mongoose");
const { Schema } = mongoose;

const matchBetListSchema = new Schema({
  winnerSid: { type: String, required: true },
  eventId: { type: String, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("MatchBetList", matchBetListSchema);
