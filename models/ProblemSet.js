const mongoose = require("mongoose"); // Erase if already required

var ProblemSet = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  input_format: {
    type: String,
    required: true,
  },
  output_format: {
    type: String,
    required: true,
  },
  constraints: {
    type: String,
    required: true,
  },
  sample_input: [
    {
      explanation: {
        type: String,
      },
      content: String,
    },
  ],
  sample_output: [
    {
      explanation: {
        type: String,
      },
      content: String,
    },
  ],
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
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

//Export the model

module.exports = mongoose.model("ProblemSet", ProblemSet);
