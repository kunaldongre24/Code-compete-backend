const checkPid = require("../helper/checkPID");
const makeId = require("../helper/makeId");
const { getUsers, handleKickUser } = require("../helper/users");
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
  async handleSendMessage(req, res) {
    try {
      const io = req.app.get("socket");
      const user = await RoomUserMap.findOne({ userId: req.user._id }).populate(
        "userId",
        "-hash -salt -currentSession -authStrategy -verified -createdOn -role"
      );
      io.in(user.roomId).emit("message", {
        user: user.userId.username,
        text: message,
      });
      res.send({ status: 1, msg: "Message Sent" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async handleUpdateStatus(req, res) {
    try {
      const io = req.app.get("socket");
      const { userId, status } = req.body;
      const users = await updateStatus(userId, status);
      io.in(users[0].roomId).emit("users", users);
      res.send({ status: 1, msg: "Updated Status" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async handleUpdateSpectate(req, res) {
    try {
      const io = req.app.get("socket");
      const { userId, status } = req.body;
      const users = await updateSpectate(userId, status);
      io.in(users[0].roomId).emit("notification", {
        type: 2,
        description: `${
          users.filter((x) => x.socketId === socket.id)[0].userId.username
        } ${status ? "is now spectating." : "has joined the race."}`,
      });
      io.in(users[0].roomId).emit("users", users);
      res.send({ status: 1, msg: "Updated Spectate!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async kickUser(req, res) {
    try {
      const io = req.app.get("socket");
      const { userId } = req.body;
      const user = await handleKickUser(userId);
      if (user) {
        io.in(user.roomId).emit("notification", {
          type: 0,
          description: `${user.userId.username} has been kicked!`,
        });
        const users = await getUsers(user.roomId);
        io.in(users[0].roomId).emit("users", users);
      }
      res.send({ status: 1, msg: "User has been kicked!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async muteUser(req, res) {
    try {
      const io = req.app.get("socket");
      const { userId, status } = req.body;
      const user = await handleMute(userId, status);
      if (user) {
        io.in(userId).emit("notification", {
          type: !status,
          description: `You have been ${status ? "muted" : "unmuted"}!`,
        });
        const users = await getUsers(user.roomId);
        io.in(users[0].roomId).emit("users", users);
      }
      res.send({ status: 1, msg: "User has been muted!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async updateTpp(req, res) {
    try {
      const io = req.app.get("socket");
      const { roomId, val } = req.body;
      const room = await updateTpp(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `Tpp changed to ${val}.`,
      });
      res.send({ status: 1, msg: "Tpp Updated" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async updateRounds(req, res) {
    try {
      const io = req.app.get("socket");
      const { roomId, val } = req.body;
      const room = await updateRounds(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `No. of rounds changed to ${val}.`,
      });
      res.send({ status: 1, msg: "Rounds Updated" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async updateMinRating(req, res) {
    try {
      const io = req.app.get("socket");
      const { roomId, val } = req.body;
      const room = await updateMinRating(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `Min Rating changed to ${val}.`,
      });
      res.send({ status: 1, msg: "Min Rating Updated" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async updateMaxRating(req, res) {
    try {
      const io = req.app.get("socket");
      const { val } = req.body;
      const room = await updateMaxRating(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `Max Rating changed to ${val}.`,
      });
      res.send({ status: 1, msg: "Max Rating Updated" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
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
