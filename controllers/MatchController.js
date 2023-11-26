const axios = require("axios");
const Count = require("../models/Count");
const MatchList = require("../models/MatchList");
const BetUserMap = require("../models/BetUserMap");
const User = require("../models/User");

const MatchController = {
  async getLiveTime(req, res) {
    res.send({ time: Date.now() });
  },
  async setMatchInfo(req, res) {
    try {
      const { matchId } = req.params;
      const url = "https://111111.info/pad=82/listGames?sport=4";
      const response = await axios.get(url);
      const data = response.data.result;

      if (data.length === 0) {
        return res.send({ status: true });
      }
      const existingMatch = await MatchList.findOne({
        eventId: parseInt(matchId),
      });
      if (!existingMatch) {
        // If a record with the same event ID does not exist, create a new one.
        const singleMatch = data.find((x) => x.eventId === parseInt(matchId));
        if (singleMatch) {
          await MatchList.create(singleMatch);
          return res.send({ status: true });
        }
      }

      res.send({ status: true }); // Data with the same event ID already exists, no update needed.
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
      const { userId, startDate, endDate } = req.params;
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }
      // Get the user's creation date
      const userCreationDate = user.createdOn;
      const last10Matches = await MatchList.find({
        createdOn: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ createdOn: -1 });
      const resultArray = [];
      let totalBalance = 0;
      // Iterate through each match
      for (const match of last10Matches) {
        const matchObj = {
          matchId: match.eventId,
          matchName: match.eventName,
          totalProfitLoss: 0,
          totalCommission: 0,
          balance: 0,
          settled: match.settled,
          winner: match.winnerSid,
          startTime: match.time,
          markets: match.markets,
        };
        // Find all bets related to the current match and user
        const bets = await BetUserMap.find({
          matchId: match.eventId,
          company: userId,
        });
        if (match.createdOn > userCreationDate || bets.length > 0) {
          // Calculate total profit/loss for the current match and user
          for (const bet of bets) {
            if (bet.settled) {
              if (bet.name === "matchbet" || bet.name === "tossbet") {
                if (bet.won) {
                  matchObj.totalProfitLoss -= bet.lossAmount;
                } else {
                  matchObj.totalProfitLoss += bet.profitAmount;
                  matchObj.totalCommission -= bet.comAmount;
                }
              } else if (bet.name === "sessionbet") {
                if (bet.won) {
                  matchObj.totalProfitLoss -= bet.lossAmount;
                } else {
                  matchObj.totalProfitLoss += bet.profitAmount;
                }
                matchObj.totalCommission += bet.sessionCommission - bet.myCom;
              }
            }
          }
          // Find all coins related to the current match, user, and before the match
          totalBalance = matchObj.totalProfitLoss + matchObj.totalCommission;

          matchObj.balance = totalBalance;

          resultArray.push(matchObj);
        }
      }

      res.send(resultArray);
    } catch (error) {
      console.error("Error fetching data:", error);
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
      const match = await MatchList.findOne({ eventId: matchId });
      if (!match) {
        return res.send({ status: 0, msg: "Match not found" });
      }
      res.send(match);
    } catch (error) {
      console.error(error);
      res.send("Internal server error");
    }
  },
};

module.exports = MatchController;
