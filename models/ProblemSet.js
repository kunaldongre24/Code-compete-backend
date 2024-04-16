const mongoose = require("mongoose"); // Erase if already required

var ProblemSet = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  timeLimit: {
    type: Number,
    required: false,
  },
  memoryLimit: { type: Number, required: false },
  uniqueId: {
    type: String,
    uniqueId: true,
    required: true,
  },
  contestId: {
    type: String,
    required: true,
  },
  problemId: { type: String, required: true },
  description: {
    type: String,
  },
  input_specification: {
    type: String,
  },
  output_specification: {
    type: String,
  },
  samples: [
    {
      input: { type: String, required: true },
      output: { type: String },
    },
  ],
  testcases_count: {
    type: Number,
    default: 0,
  },
  note: {
    type: String,
  },
  rating: {
    type: Number,
    required: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

//Export the model

module.exports = mongoose.model("ProblemSet", ProblemSet);
