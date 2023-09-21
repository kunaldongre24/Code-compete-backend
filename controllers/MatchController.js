const axios = require("axios");
const Count = require("../models/Count");
const MatchList = require("../models/MatchList");
const BetUserMap = require("../models/BetUserMap");

const MatchController = {
  async getLiveTime(req, res) {
    res.send({ time: Date.now() });
  },
  async setMatchInfo(req, res) {
    try {
      const { matchId } = req.params;
      const url = "https://111111.info/pad=82/listGames?sport=4&inplay=1";
      const response = await axios.post(url, { eventId: matchId });
      const data = response.data;
      if (data.length === 0) {
        return;
      }
      const singleMatch = data.filter((x) => x.eventId === matchId);
      singleMatch[0].createdOn = Date.now();

      singleMatch[0].settled = false;
      await MatchList.create(singleMatch[0]);
      res.send({ status: true });
    } catch (error) {
      console.error(error);
      res.send({
        status: false,
        message: "An error occurred while processing the request",
      });
    }
  },
  async addData(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "player" },
        { $inc: { count: 1 } },
        { new: true }
      );
      res.json(updatedCount);
    } catch (error) {
      res.json({ message: error.message });
    }
  },
  async getAllMatchList(req, res) {
    try {
      const { userId } = req.params;
      const betUserMap = await BetUserMap.find({
        company: userId,
        settled: true,
      });
      const data = betUserMap.map((doc) => doc.toObject());
      const matchList = await MatchList.find();
      const value = matchList.map((doc) => doc.toObject());
      for (var i = 0; i < value.length; i++) {
        let sum = 0;
        const arr = data.filter((x) => x.matchId === value[i].gameId);
        let myComm = 0;
        let isCom = false;
        for (var j = 0; j < arr.length; j++) {
          if (arr[j].name === "matchbet") {
            if (!isCom) {
              myComm -= arr[j].comAmount;
              isCom = true;
            }
            if (arr[j].won) {
              sum -= arr[j].lossAmount;
            } else {
              sum += arr[j].profitAmount;
            }
          } else if (arr[j].name === "sessionbet") {
            myComm -=
              Math.abs(arr[j].myCom) - Math.abs(arr[j].sessionCommission);
            if (arr[j].won) {
              sum -= arr[j].lossAmount;
            } else {
              sum += arr[j].profitAmount;
            }
          }
        }
        value[i].winning = sum;
        value[i].myComm = myComm;
      }
      res.send(value);
    } catch (error) {
      console.error(error);
      res.send("Internal server error");
    }
  },
  async getMatchList(req, res) {
    try {
      const matchList = await MatchList.find();
      const value = matchList.map((doc) => doc.toObject());
      res.send(value);
    } catch (error) {
      console.error(error);
      res.send("Internal server error");
    }
  },
  async getSingleMatch(req, res) {
    try {
      const { matchId } = req.params;
      const match = await MatchList.findOne({ gameId: matchId });
      if (!match) {
        return res.status(404).send("Match not found");
      }
      res.send(match);
    } catch (error) {
      console.error(error);
      res.send("Internal server error");
    }
  },
};

module.exports = MatchController;
