const mongoose = require("mongoose");

const userRelationSchema = new mongoose.Schema({
  userOneId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userTwoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
    required: true,
  },
});

const UserRelation = mongoose.model("UserRelation", userRelationSchema);
module.exports = UserRelation;
