const Message = require("../models/Message");
const Room = require("../models/Room");
const User = require("../models/User");

const leaveRoom = async (socket) => {
  try {
    const { userId, roomId } = socket;

    const room = await Room.findOneAndUpdate(
      { roomId },
      { $pull: { users: userId } },
      { new: true }
    );

    if (!room) {
      console.log("room not found");
      return;
    }

    const user = await User.findById(userId); // Fetch the user by userId
    const username = user ? user.username : "Unknown User";

    await Message.create({
      roomId,
      type: "notification",
      content: `${username} left the room!`,
      isCritical: true,
    });

    const messages = await Message.find({ roomId: roomId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "senderId",
        select: "username", // Select only the username field
      });

    socket.emit("message", messages);
  } catch (err) {
    console.error(err);
    return;
  }
};

module.exports = leaveRoom;
