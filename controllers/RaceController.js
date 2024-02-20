const ProblemSet = require("../models/ProblemSet");
const Race = require("../models/Race");
const Room = require("../models/Room");

const RaceController = {
  async createRace(req, res) {
    try {
      const userId = req.user._id;
      const room = await Room.findOne({ admin: userId });
      if (!room) {
        return res.send({ status: 0, msg: "Your room does not exist!" });
      }
      const { tpp, minRating, maxRating, rounds } = room;

      if (minRating < 800 || maxRating > 3500)
        return res.send({ status: 0, msg: "Invalid Rating!" });
      if (tpp > 120 || tpp < 20) {
        return res.send({ status: 0, msg: "Invalid Time Per Problem!" });
      }
      if (rounds < 1 || rounds > 8) {
        return res.send({ status: 0, msg: "Invalid Number of Rounds!" });
      }

      const existingRace = await Race.findOne({
        admin: userId,
        isFinished: false,
      });
      if (existingRace) {
        return res.send({ status: 1, msg: "A race is already going on!" });
      }
      const problemSets = await ProblemSet.aggregate([
        { $match: { rating: { $gte: minRating, $lte: maxRating } } }, // Filter based on rating range
        { $sample: { size: rounds } },
        { $project: { _id: 1 } },
      ]);
      const newRace = new Race({
        admin: userId,
        roomId: room._id,
        problemSets,
        tpp,
        minRating,
        maxRating,
      });
      const race = await newRace.save();
      let count = 5;
      const io = req.app.get("socket");
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: "Race starting in 5 seconds",
      });

      const interval = setInterval(() => {
        io.in(room.roomId).emit("count", { count });
        if (count === 0) {
          clearInterval(interval);
          io.in(room.roomId).emit("raceStarted", {
            status: 1,
          });
        }
        count--;
      }, 1000);
      res.send({ status: 1, msg: "Race Created", race, type: 1 });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Server Error" });
    }
  },
  async checkRaceStarted(req, res) {
    const { roomId } = req.body;
    if (!roomId) {
      return res.send({ status: 0 });
    }
    const race = await Race.find({ isFinished: false, roomId });
    if (race) {
      return res.send({ status: 1 });
    }
    return res.send({ status: 0 });
  },
};
module.exports = RaceController;
