const checkPid = require("../helper/checkPid");
const makeId = require("../helper/makeId");
const { getUsers, handleKickUser, handleMute } = require("../helper/users");
const Room = require("../models/Room");
const RoomUserMap = require("../models/RoomUserMap");
const CF_TC = require("../utils/CF_TC");
const scrapeProblemDetails = require("../utils/cf_scrapper");

const RoomController = {
  async check(req, res) {
    try {
      const { cid, pid } = req.params;
      const output = await scrapeProblemDetails(cid, pid);
      res.send(output);
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error!" });
    }
  },
  async check2(req, res) {
    try {
      let { cid, pid } = req.params;
      const pvcodes = new CF_TC();
      pid = checkPid(pid);
      pvcodes
        .get_testcases(cid, pid)
        .then((response) => {
          console.log(response[1].length);
          res.send({ status: 1, output: response });
        })
        .catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },

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
  async checkRoomExists(req, res) {
    try {
      const userId = req.user._id;
      const room = await Room.findOne({ admin: userId });
      if (room) {
        return res.send({ status: 1, roomId: room.roomId });
      }
      res.send({ status: 0 });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Server Error" });
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
