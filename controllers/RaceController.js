const ProblemSet = require("../models/ProblemSet");
const Race = require("../models/Race");
const RaceProblemSetMap = require("../models/RaceProblemSetMap");
const RaceUserProblemsetMap = require("../models/RaceUserProblemsetMap");
const Room = require("../models/Room");
const RoomUserMap = require("../models/RoomUserMap");

const RaceController = {
  async createRace(req, res) {
    try {
      const userId = req.user._id;
      const room = await Room.findOne({ admin: userId });
      if (!room) {
        return res.send({ status: 0, msg: "Your room does not exist!" });
      }
      const { minRating, maxRating } = room;

      if (minRating < 800 || maxRating > 3500)
        return res.send({ status: 0, msg: "Invalid Rating!" });

      const io = req.app.get("socket");
      io.in(room._id.toString()).emit("notification", {
        type: 2,
        description: "Race starting in 5 seconds",
      });
      let count = 4;
      io.in(room._id.toString()).emit("count", { count: 5 });
      const intervalPromise = new Promise((resolve) => {
        const interval = setInterval(() => {
          io.in(room._id.toString()).emit("count", { count });
          if (count <= 0) {
            clearInterval(interval);
            resolve();
          }
          count--;
        }, 1000);
      });
      await intervalPromise;
      const existingRace = await Race.findOne({
        admin: userId,
        isFinished: false,
      }).sort({ createdOn: -1 });
      if (existingRace) {
        const originalTime = new Date(existingRace.createdOn);
        const newTime = new Date(
          originalTime.getTime() + process.env.TIME_PER_PROBLEM * 60000
        );
        const currentTime = new Date(Date.now());
        if (newTime > currentTime) {
          return res.send({ status: 0, msg: "A race is already going on!" });
        }
      }
      const members = await RoomUserMap.find({
        roomId: room._id,
      });

      const problemSets = await ProblemSet.aggregate([
        {
          $match: {
            rating: {
              $gte: minRating > maxRating ? maxRating : minRating,
              $lte: maxRating,
            },
          },
        },
        { $sample: { size: 1 } },
        { $project: { _id: 1, rating: 1 } },
      ]);
      const newRace = new Race({
        admin: userId,
        roomId: room._id,
        members,
        minRating,
        maxRating,
        problemSetId: problemSets[0]._id,
      });
      const race = await newRace.save();
      const newRaceProblemSetMap = new RaceProblemSetMap({
        raceId: race._id,
        problemSetId: problemSets[0]._id,
      });
      await newRaceProblemSetMap.save();
      io.in(room._id.toString()).emit("raceStarted", {
        status: 1,
        raceId: race._id,
      });
      res.send({ status: 1, msg: "Race Created", raceId: race._id, type: 1 });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Server Error" });
    }
  },
  async getLeaderboard(req, res) {
    try {
      const { raceId } = req.body;
      const leaderboard = await RaceUserProblemsetMap.find({
        raceId,
      })
        .sort({ solveTimeMs: 1 })
        .select("solveTimeMs solved userId _id")
        .populate("userId");
      res.send({ leaderboard });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async checkRaceStarted(req, res) {
    try {
      const { roomId } = req.body;
      const userId = req.user._id;
      if (!roomId) {
        return res.send({ status: 0 });
      }
      const room = await Room.findOne({ roomId });
      if (!room) {
        return res.send({ status: 0 });
      }
      const existingRace = await Race.findOne({
        roomId: room._id,
        isFinished: false,
      }).sort({ createdOn: -1 });
      if (existingRace) {
        let isMember = false;
        if (existingRace.members.filter((x) => x.userId === userId)) {
          isMember = true;
        }
        const currentTime = new Date(Date.now());
        const originalTime = new Date(existingRace.createdOn);
        const newTime = new Date(
          originalTime.getTime() + process.env.TIME_PER_PROBLEM * 60000
        );

        if (newTime > currentTime) {
          return res.send({
            status: 1,
            raceId: existingRace._id,
            isMember,
          });
        }
      }
      return res.send({ status: 0 });
    } catch (err) {
      console.error(err);
      res.send({ status: 0 });
    }
  },
  async checkRole(req, res) {
    const userId = req.user._id;
    const { roomId } = req.body;
    if (!roomId) {
      return res.send({ status: 0 });
    }
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.send({ status: 0 });
    }
    const race = await Race.findOne({
      roomId: room._id,
      isFinished: false,
    }).sort({ createdOn: -1 });
    if (!race) {
      return res.send({ status: 0 });
    }

    if (
      race.members.filter((x) => x.userId.toString() === userId.toString())
        .length === 0
    ) {
      return res.send({ status: 0 });
    }
    const member = race.members.filter(
      (x) => x.userId.toString() === userId.toString()
    )[0];
    let role = "none";
    if (member.isSpectator) {
      role = "spectator";
    } else {
      role = "racer";
    }
    return res.send({ status: 1, role, fetched: role !== "none" });
  },
  async spectate(req, res) {
    try {
      const userId = req.user._id;
      const { raceId } = req.body;
      let result = await RaceProblemSetMap.findOne(
        {
          raceId,
        },
        "problemSetId"
      );
      if (!result) {
        return res.send({ status: 0, msg: "Not found!" });
      }
      const raceUserProblemsetMap = await RaceUserProblemsetMap.findOne({
        raceId: raceId,
        userId,
        problemSetId: result.problemSetId,
      });
      if (raceUserProblemsetMap.solved) {
        return res.send({ status: 1 });
      }
      res.send({ status: 0 });
    } catch (err) {
      console.error(err);
      return res.send({ status: 0, msg: "Interal Server Error" });
    }
  },
  async getRacesByRoomId(req, res) {
    try {
      const { roomId } = req.params;
      const room = await Room.findOne({ roomId });
      if (!room) {
        return res.send({ status: 0, msg: "Room not found!" });
      }
      const races = await Race.find({ roomId: room._id }).populate({
        path: "problemSetId",
        select: "_id rating",
      });
      return res.send({ status: 1, races });
    } catch (err) {
      console.error(err);
      return res.send({ status: 0, msg: "Interal Server Error" });
    }
  },
};
module.exports = RaceController;
