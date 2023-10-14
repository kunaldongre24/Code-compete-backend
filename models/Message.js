const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  message: { type: String, required: true },
  createdOn: { type: Date, default: Date.now, required: true },
});

const Message = mongoose.model("Message", messageSchema);

// Function to update or create a new message
async function updateMessage(newMessage) {
  try {
    // Find the existing message and update it, or create a new one if it doesn't exist
    const result = await Message.findOneAndUpdate(
      {},
      { message: newMessage, createdOn: Date.now() },
      { upsert: true, new: true }
    );

    return result;
  } catch (error) {
    throw error;
  }
}
async function fetchMessage() {
  try {
    // Use findOne to retrieve the message
    const message = await Message.findOne().select("message");

    return message;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  Message,
  updateMessage,
  fetchMessage,
};
