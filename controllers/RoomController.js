const makeId = require("../helper/makeId");
const Message = require("../models/Message");
const Room = require("../models/Room");

const RoomController = {
  async createRoom(req, res) {
    try {
      const userId = req.user._id;
      const roomId = makeId(10);
      const room = await Room.findOne({ admin: userId });
      if (room) {
        return res.send({
          status: 1,
          type: 2,
          msg: "Rejoined the Room",
          roomId: room.roomId,
        });
      }
      const newRoom = new Room({
        admin: userId,
        roomId: roomId,
      });
      await newRoom.save();
      res.send({ status: 1, msg: "Room Created", roomId: roomId, type: 1 });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Server Error" });
    }
  },

  async handleRemoveUserFromRoom(req, res) {
    try {
      const userId = req.user._id;
      const userIdToRemove = req.body.userId;
      const roomId = req.body.roomId;

      const updatedRoom = await Room.findOneAndUpdate(
        { _id: roomId, admin: userId },
        { $pull: { users: userIdToRemove } },
        { new: true }
      );

      if (!updatedRoom) {
        return res
          .status(404)
          .json({ msg: "Room doesn't exist or insufficient permissions!" });
      }

      res
        .status(200)
        .json({ msg: "User removed from the room successfully", updatedRoom });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Internal Server Error" });
    }
  },
  async getRoomInfo(req, res) {
    try {
      const { roomId } = req.params;
      const room = await Room.findOne({ roomId });
      if (!room) {
        return res.send({ status: 0, msg: "Room not found" });
      }
      res.send({ status: 1, room: room });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Server Error" });
    }
  },
};
module.exports = RoomController;
