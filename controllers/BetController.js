const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const CoinController = require("./CoinController");
const CommissionController = require("./CommissionController");
const { countAndUpdateCoin, removeNum } = require("./CoinController");
const { getMyAgents, getUserInformation } = require("./AuthController");
const clientCollection = require("../helper/clientCollection");
const countCash = require("../helper/countCash");
const BetList = require("../models/BetList");
const CoinMap = require("../models/Coins");
const BetDataMap = require("../models/BetDataMap");
const BetUserMap = require("../models/BetUserMap");
const MatchBetMap = require("../models/MatchBetMap");
const MatchList = require("../models/MatchList");
const MatchBetList = require("../models/MatchBetList");
const { ObjectId } = require("mongodb");
const positionCalculator = require("../helper/positionCalculator");
const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const apiSwitch = require("../helper/apiSwitch");
const Ledger = require("../models/Ledger");
const TossBet = require("../models/TossBetMap");
const calculateCompanyExpo = require("../helper/calculateCompanyExpo");

const BetController = {
  didWon(isBack, value, odds) {
    let won;
    if (isBack) {
      won = value >= odds;
    } else {
      won = value < odds;
    }
    return won;
  },
  async agentReport(req, res) {
    const resultDb = new BetList({
      fancyName: "test",
      value: "test",
      matchId: 234234,
      createdOn: Date.now(),
    });
    const response = await resultDb.save();
    res.send({ response });
  },
  async resolveBet(fancyName, value) {
    if (!fancyName || !fancyName.trim() || !value || !value.trim()) {
      return;
    }
    const wonArr = [];
    const data = await BetUserMap.find({
      fancyName,
      settled: false,
      name: "sessionbet",
    });
    const resp = await BetDataMap.find({ fancyName, settled: false });

    if (!resp.length) {
      console.log("No matching documents.");
      return;
    }
    for (i = 0; i < data.length; i++) {
      const {
        lossAmount,
        profitAmount,
        _id,
        isBack,
        odds,
        player,
        company,
        matchId,
        fancyName,
      } = data[i];
      const won = BetController.didWon(isBack, value, odds);
      wonArr.push(won);
      const commissionAmount = won ? lossAmount : profitAmount;
      await CommissionController.coinDistribution(
        won,
        player,
        company,
        commissionAmount,
        _id,
        matchId,
        fancyName
      );
      await BetUserMap.findOneAndUpdate(
        { _id: _id },
        { settled: true, won: won, result: value, lastUpdated: Date.now() },
        { new: true }
      );
      await countAndUpdateCoin(company.toLowerCase());
      await countAndUpdateCoin(player.toLowerCase());
    }

    const settledArr = [];
    var totalBetAmount = 0;
    var match_id;
    var player_id;
    for (let i = 0; i < resp.length; i++) {
      const {
        _id,
        odds,
        isBack,
        userId,
        transactionId,
        matchId,
        stake,
        priceValue,
      } = resp[i];

      player_id = userId;
      match_id = matchId;
      const rate = priceValue > 1 ? priceValue : 1;
      const amount = rate * stake;
      totalBetAmount += amount;
      if (!settledArr.includes(transactionId)) {
        settledArr.push(transactionId);
        const transactionData = await CoinMap.findOne({ _id: transactionId });
        if (transactionData.value !== 0) {
          const coinDb = new CoinMap({
            value: parseFloat(transactionData.value),
            msg: "Settlement",
            type: 3,
            selectionName: fancyName,
            matchId,
            getter: userId,
            createdOn: Date.now(),
          });
          await coinDb.save();
          await countAndUpdateCoin(userId.toLowerCase());
        }
      }
      const isWon = BetController.didWon(isBack, value, odds);
      await BetDataMap.findOneAndUpdate(
        { _id: _id },
        { settled: true, won: isWon, result: value, lastUpdated: Date.now() },
        { merge: true }
      );
    }
    const resultDb = new BetList({
      fancyName,
      value,
      matchId: match_id,
      createdOn: Date.now(),
    });
    await resultDb.save();
    return;
  },
  async resolveTossBet(winnerSid, matchId) {
    if (!winnerSid || !matchId) {
      return;
    }
    var won = false;
    const data = await BetUserMap.find({
      matchId: matchId,
      settled: false,
      name: "tossbet",
    });
    const matchInfo = await TossBet.find({
      matchId: matchId,
      settled: false,
    });
    if (matchInfo.length === 0) {
      console.log("No bets found");
      return;
    }
    const coin = await CoinMap.findOne({ _id: matchInfo[0].transactionId });
    const transactionData = coin.toObject();
    let position = transactionData.newArr.filter((x) => x.sid === winnerSid)[0]
      .position;
    let playerId,
      playerComPercentage = 3;
    const comArr = [];
    for (i = 0; i < data.length; i++) {
      const {
        lossAmount,
        profitAmount,
        _id,
        isBack,
        player,
        company,
        selectionId,
        matchId,
        commissionPercentage,
        adminShare,
        selectionName,
      } = data[i];
      playerId = player;
      playerComPercentage -= commissionPercentage;
      if (isBack) {
        if (winnerSid === selectionId) {
          won = true;
        } else {
          won = false;
        }
      } else {
        if (winnerSid === selectionId) {
          won = false;
        } else {
          won = true;
        }
      }
      if (position < 0) {
        const myComShare = (((position * 3) / 100) * adminShare) / 100;
        const comAmount = (position * commissionPercentage) / 100 - myComShare;
        const elem = { comAmount, player: company };
        comArr.push(elem);
        if (comAmount !== 0) {
          const coinDb = new CoinMap({
            value: Math.abs(comAmount),
            msg: "Commission Distribution",
            matchId,
            selectionName,
            type: 3,
            getter: company,
            createdOn: Date.now(),
          });
          await coinDb.save();
          countAndUpdateCoin(company);
        }
      } else {
        const elem = { comAmount: 0, player: company };
        comArr.push(elem);
      }
      if (won) {
        CommissionController.coinDistribution(
          won,
          player,
          company,
          lossAmount,
          _id,
          matchId,
          selectionName
        );
      } else {
        CommissionController.coinDistribution(
          won,
          player,
          company,
          profitAmount,
          _id,
          matchId,
          selectionName
        );
      }
      countAndUpdateCoin(player.toLowerCase());
      countAndUpdateCoin(company.toLowerCase());
    }

    if (position < 0) {
      const comAmount = (position * playerComPercentage) / 100;
      const elem = { comAmount, player: playerId };
      comArr.push(elem);
    } else {
      const elem = { comAmount: 0, player: playerId };
      comArr.push(elem);
    }

    if (matchInfo.length === 0) {
      console.log("No matching documents.");
      return;
    }
    const settledArr = [];
    for (const bet of matchInfo) {
      const { selectionId, isBack, userId, transactionId, matchId } = bet;
      if (!settledArr.includes(transactionId)) {
        settledArr.push(transactionId);
        const coinRef = await CoinMap.findOne({ _id: transactionId });
        const transactionData = coinRef.toObject();
        if (transactionData.value !== 0) {
          const coinDb = new CoinMap({
            value: parseFloat(transactionData.value),
            msg: "Settlement",
            matchId,
            type: 3,
            getter: userId,
            createdOn: Date.now(),
          });
          await coinDb.save();
          countAndUpdateCoin(userId);
        }
      }
      var isWon = false;
      if (isBack) {
        if (winnerSid === selectionId) {
          isWon = true;
        } else {
          isWon = false;
        }
      } else {
        if (winnerSid === selectionId) {
          isWon = false;
        } else {
          isWon = true;
        }
      }
      await TossBet.updateOne(
        { _id: bet._id },
        { settled: true, won: isWon, winner: winnerSid }
      );
    }
    for (const bet of data) {
      const { selectionId, isBack, company } = bet;

      var isWon = false;
      if (isBack) {
        if (winnerSid === selectionId) {
          isWon = true;
        } else {
          isWon = false;
        }
      } else {
        if (winnerSid === selectionId) {
          isWon = false;
        } else {
          isWon = true;
        }
      }
      const comAmount = comArr.filter((x) => x.player === company)[0].comAmount;
      await BetUserMap.updateOne(
        { _id: bet._id },
        {
          settled: true,
          won: isWon,
          winner: winnerSid,
          comAmount,
          lastUpdated: Date.now(),
        }
      );
    }
    const resultDoc = new MatchBetList({
      eventId: matchId,
      winnerSid,
      createdOn: Date.now(),
    });
    await resultDoc.save();

    return;
  },
  async resolveMatchBet(winnerSid, matchId) {
    if (!winnerSid || !matchId) {
      return;
    }
    await MatchList.updateOne(
      { eventId: matchId },
      { $set: { settled: true, winnerSid: winnerSid } }
    );
    var won = false;
    const data = await BetUserMap.find({
      matchId: matchId,
      settled: false,
      name: "matchbet",
    });
    const matchInfo = await MatchBetMap.find({
      matchId: matchId,
      settled: false,
    });
    if (matchInfo.length === 0) {
      console.log("No bets found");
      return;
    }
    const coin = await CoinMap.findOne({ _id: matchInfo[0].transactionId });
    const transactionData = coin.toObject();
    let position = transactionData.newArr.filter((x) => x.sid === winnerSid)[0]
      .position;
    let playerId,
      playerComPercentage = 3;
    const comArr = [];
    for (i = 0; i < data.length; i++) {
      const {
        lossAmount,
        profitAmount,
        _id,
        isBack,
        player,
        company,
        selectionId,
        matchId,
        commissionPercentage,
        adminShare,
        selectionName,
      } = data[i];
      playerId = player;
      playerComPercentage -= commissionPercentage;
      if (isBack) {
        if (winnerSid === selectionId) {
          won = true;
        } else {
          won = false;
        }
      } else {
        if (winnerSid === selectionId) {
          won = false;
        } else {
          won = true;
        }
      }
      if (position < 0) {
        const myComShare = (((position * 3) / 100) * adminShare) / 100;
        const comAmount = (position * commissionPercentage) / 100 - myComShare;
        const elem = { comAmount, player: company };
        comArr.push(elem);
        if (comAmount !== 0) {
          const coinDb = new CoinMap({
            value: Math.abs(comAmount),
            msg: "Commission Distribution",
            matchId,
            selectionName,
            type: 3,
            getter: company,
            createdOn: Date.now(),
          });
          await coinDb.save();
          countAndUpdateCoin(company);
        }
      } else {
        const elem = { comAmount: 0, player: company };
        comArr.push(elem);
      }
      if (won) {
        CommissionController.coinDistribution(
          won,
          player,
          company,
          lossAmount,
          _id,
          matchId,
          selectionName
        );
      } else {
        CommissionController.coinDistribution(
          won,
          player,
          company,
          profitAmount,
          _id,
          matchId,
          selectionName
        );
      }
      countAndUpdateCoin(player.toLowerCase());
      countAndUpdateCoin(company.toLowerCase());
    }

    if (position < 0) {
      const comAmount = (position * playerComPercentage) / 100;
      const elem = { comAmount, player: playerId };
      comArr.push(elem);
    } else {
      const elem = { comAmount: 0, player: playerId };
      comArr.push(elem);
    }

    if (matchInfo.length === 0) {
      console.log("No matching documents.");
      return;
    }
    const settledArr = [];
    for (const bet of matchInfo) {
      const { selectionId, isBack, userId, transactionId, matchId } = bet;
      if (!settledArr.includes(transactionId)) {
        settledArr.push(transactionId);
        const coinRef = await CoinMap.findOne({ _id: transactionId });
        const transactionData = coinRef.toObject();
        if (transactionData.value !== 0) {
          const coinDb = new CoinMap({
            value: parseFloat(transactionData.value),
            msg: "Settlement",
            matchId,
            type: 3,
            getter: userId,
            createdOn: Date.now(),
          });
          await coinDb.save();
          countAndUpdateCoin(userId);
        }
      }
      var isWon = false;
      if (isBack) {
        if (winnerSid === selectionId) {
          isWon = true;
        } else {
          isWon = false;
        }
      } else {
        if (winnerSid === selectionId) {
          isWon = false;
        } else {
          isWon = true;
        }
      }
      await MatchBetMap.updateOne(
        { _id: bet._id },
        { settled: true, won: isWon, winner: winnerSid }
      );
    }
    for (const bet of data) {
      const { selectionId, isBack, company } = bet;

      var isWon = false;
      if (isBack) {
        if (winnerSid === selectionId) {
          isWon = true;
        } else {
          isWon = false;
        }
      } else {
        if (winnerSid === selectionId) {
          isWon = false;
        } else {
          isWon = true;
        }
      }
      const comAmount = comArr.filter((x) => x.player === company)[0].comAmount;
      await BetUserMap.updateOne(
        { _id: bet._id },
        {
          settled: true,
          won: isWon,
          winner: winnerSid,
          comAmount,
          lastUpdated: Date.now(),
        }
      );
    }
    const resultDoc = new MatchBetList({
      eventId: matchId,
      winnerSid,
      createdOn: Date.now(),
    });
    await resultDoc.save();

    return;
  },
  async checkDeleteFancyResult(req, res) {
    try {
      const { fancyName, matchId } = req.body;
      await BetController.deleteFancyResult(fancyName, matchId);
      res.send("Fancy Result Deleted!");
    } catch (error) {
      console.log(error);
      res.send("Error Encountered");
    }
  },
  async checkDeleteMatchResult(req, res) {
    try {
      const { matchId } = req.body;
      await BetController.deleteMatchResult(matchId);
      res.send("Match Result Deleted!");
    } catch (error) {
      console.log(error);
      res.send("Error Encountered");
    }
  },
  async deleteFancyResult(fancyName, matchId) {
    try {
      const queries = [
        BetDataMap.updateMany(
          { matchId, fancyName },
          { $set: { settled: false, won: false } }
        ),
        BetUserMap.updateMany(
          { matchId, fancyName },
          { $set: { settled: false, won: false } }
        ),
        CoinMap.deleteMany({ matchId, selectionName: fancyName, type: 3 }),
      ];
      for await (const query of queries) {
        // Do nothing
      }
    } catch (err) {
      console.error(err);
    }
  },
  async deleteMatchResult(matchId) {
    try {
      const queries = [
        MatchList.updateOne(
          { eventId: matchId },
          { $set: { settled: false, winnerSid: "" } }
        ),
        MatchBetMap.updateMany(
          { matchId },
          { $set: { settled: false, won: false } }
        ),
        BetUserMap.updateMany(
          { matchId, name: "matchbet" },
          { $set: { settled: false } }
        ),
        CoinMap.deleteMany({ selectionName: matchId, type: 3 }),
      ];
      for await (const query of queries) {
        // Do nothing
      }
    } catch (err) {
      console.error(err);
    }
  },
  async deleteMatchBet(req, res) {
    const { matchId, pwd } = req.params;

    try {
      await BetController.deleteMbets(matchId);
      res.send("Bet Deleted");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error deleting the bet.");
    }
  },
  async deleteMbets(matchId) {
    try {
      // Step 1: Delete BetUserMap rows
      await BetUserMap.deleteMany({ matchId, name: "matchbet" });

      // Step 2: Find MatchBetMap rows by matchId
      const matchBetMaps = await MatchBetMap.find({ matchId });

      // Step 3: Collect transactionIds from MatchBetMap
      const transactionIds = matchBetMaps.map(
        (matchBetMap) => matchBetMap.transactionId
      );

      // Step 4: Delete Coin rows by transactionId
      await CoinMap.deleteMany({ _id: { $in: transactionIds } });

      // Step 5: Delete MatchBetMap rows by matchId
      await MatchBetMap.deleteMany({ matchId });

      return;
    } catch (err) {
      console.error(err);
      return;
    }
  },
  async deleteSbets(req, res) {
    const { matchId, fancyName } = req.body;
    try {
      await BetUserMap.deleteMany({ matchId, name: "sessionbet", fancyName });

      const sessionBetMaps = await BetDataMap.find({
        matchId,
        fancyName,
      });
      const transactionIds = sessionBetMaps.map(
        (sessionBetMap) => sessionBetMap.transactionId
      );

      // Step 4: Delete Coin rows by transactionId
      await CoinMap.deleteMany({ _id: { $in: transactionIds } });

      // Step 5: Delete MatchBetMap rows by matchId
      await BetDataMap.deleteMany({ matchId, fancyName });

      return res.send({ msg: "Bet deleted successfully!" });
    } catch (err) {
      console.error(err);
      return;
    }
  },
  async settleBet(req, res) {
    const { fancyName, value } = req.body;
    BetController.resolveBet(fancyName, value);
    res.send({ msg: "Bet Settled" });
  },
  async settleMatchBet(req, res) {
    const { winnerSid, matchId } = req.body;
    if (winnerSid === "") {
      return res.send({
        msg: "Invalid winnerSid",
        status: false,
      });
    }
    if (winnerSid === "matchTied") {
      await BetController.deleteMbets(matchId);
      await MatchList.updateOne(
        { eventId: matchId },
        { $set: { settled: true, winnerSid: "Match Tied" } }
      );
      return res.send({ msg: "Bet Settled" });
    }
    if (winnerSid === "noResult") {
      await BetController.deleteMbets(matchId);
      await MatchList.updateOne(
        { eventId: matchId },
        { $set: { settled: true, winnerSid: "No Result" } }
      );
      return res.send({ msg: "Bet Settled" });
    }
    const resp = await BetDataMap.find({ matchId, settled: false });
    if (resp.length) {
      res.send({ msg: "Please settle all session bets!", status: false });
      return;
    }
    await BetController.resolveMatchBet(winnerSid, matchId);
    res.send({ msg: "Bet Settled" });
  },
  async settleTossBet(req, res) {
    const { matchId, winnerSid } = req.body;
    BetController.resolveTossBet(winnerSid, matchId);
    res.send({ msg: "Bet Settled" });
  },
  async getBetsByMatchId(req, res) {
    try {
      const { matchId } = req.params;
      const uniqueFancyNames = await BetDataMap.distinct("fancyName", {
        matchId,
      }).exec();
      res.send(uniqueFancyNames);
    } catch (error) {
      // Handle any errors that occur during the execution
      res.send("An error occurred");
    }
  },
  async fetchUnsettledMatches(socket) {
    try {
      const unsettledMatches = await MatchList.find({
        settled: { $ne: true },
      }).exec();
      socket.emit("unsettledMatches", unsettledMatches);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Internal server error");
    }
  },
  async fetchUnsettledToss(req, res) {
    try {
      const distinctMatches = await TossBet.distinct("matchId", {
        settled: false,
      });
      const result = await Promise.all(
        distinctMatches.map(async (matchId) => {
          const tossBet = await TossBet.findOne(
            { matchId, settled: false },
            { runnerArray: 1, matchId: 1, matchname: 1, time: 1, _id: 0 }
          );
          return tossBet;
        })
      );
      res.send(result);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Internal server error");
    }
  },
  async getCompanyLenDen(req, res) {
    const userId = req.user.username;
    const { startDate, endDate } = req.params;
    const datePattern = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{2}$/;

    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      res.status(400).send("Invalid date format. Please use 'mm-dd-yy'.");
      return;
    }
    const resultArray = await BetController.getCompanyExp(
      userId,
      startDate,
      endDate
    );
    res.send(resultArray ? resultArray : []);
  },

  async getCompanyExp(userId, startDate, endDate) {
    try {
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }
      // Get the user's creation date
      const userCreationDate = user.createdOn;
      const myMatchShare = user.matchShare;
      const companyShare = 100 - myMatchShare;

      const last10Matches = await MatchList.find({
        createdOn: {
          $gte: startDate,
          $lte: endDate,
        },
      })
        .sort({ time: 1 })
        .exec();
      const ledgerEntries = await Ledger.find({
        $or: [{ setter: userId }, { getter: userId }],
        createdOn: {
          $gte: startDate,
          $lte: endDate,
        },
      }).exec();

      const combinedEntries = [...last10Matches, ...ledgerEntries].sort(
        (a, b) => {
          return (
            new Date(a.time ? a.time : a.createdOn) -
            new Date(b.time ? b.time : b.createdOn)
          );
        }
      );
      const resultArray = [];
      let balance = await BetController.calculatePrevMatchBalance(
        userId,
        startDate
      );
      let i = 0;
      for (const match of combinedEntries) {
        if (match.eventId) {
          const matchObj = {
            matchId: match.eventId,
            matchName: match.eventName,
            totalProfitLoss: 0,
            startTime: match.time,
          };
          // Find all bets related to the current match and user
          const bets = await BetUserMap.find({
            matchId: match.eventId,
            company: userId,
            settled: true,
          })
            .lean()
            .exec();

          if (match.createdOn > userCreationDate || bets.length > 0) {
            // Calculate total profit/loss for the current match and user
            const totalBalance = await calculateCompanyExpo(bets, companyShare);

            // Update the balance for this match by adding the totalProfitLoss
            matchObj.totalProfitLoss = totalBalance;
            balance += totalBalance;
            matchObj.balance = balance;
            matchObj.i = i;
            i++;
            resultArray.push(matchObj);
          }
        } else {
          let totalBalance = 0;
          const matchObj = {
            matchId: match._id,
            matchName: match.getter === userId ? "Cash Received" : "Cash Paid",
            totalProfitLoss: 0,
            startTime: match.createdOn,
            note: match.note,
          };

          // Determine if the entry is Cash Received or Cash Paid
          if (match.getter === userId) {
            totalBalance += match.value;
          } else {
            totalBalance -= match.value;
          }
          matchObj.totalProfitLoss = totalBalance;
          balance += totalBalance;
          matchObj.balance = balance;
          matchObj.i = i;
          i++;
          resultArray.push(matchObj);
        }
      }

      return resultArray;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async calculatePrevMatchBalance(userId, startDate) {
    try {
      const user = await User.findOne({ username: userId }).lean().exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }

      const userCreationDate = user.createdOn;
      const myMatchShare = user.matchShare;
      const companyShare = 100 - myMatchShare;
      const [last10Matches, ledgerEntries] = await Promise.all([
        MatchList.find({
          createdOn: { $lte: startDate },
        })
          .lean()
          .exec(),
        Ledger.find({
          $or: [{ setter: userId }, { getter: userId }],
          createdOn: { $lte: startDate },
        })
          .lean()
          .exec(),
      ]);

      const calculateBalance = async (entries) => {
        let balance = 0;

        await Promise.all(
          entries.map(async (match) => {
            const matchDate = match.time
              ? new Date(match.time)
              : new Date(match.createdOn);

            if (matchDate < userCreationDate) return;

            if (match.eventId) {
              const bets = await BetUserMap.find({
                matchId: match.eventId,
                company: userId,
                settled: true,
              })
                .lean()
                .exec();

              const totalBalance = await calculateCompanyExpo(
                bets,
                companyShare
              );
              balance += totalBalance;
            } else {
              let totalBalance = 0;
              if (match.getter === userId) {
                totalBalance += match.value;
              } else {
                totalBalance -= match.value;
              }
              balance += totalBalance;
            }
          })
        );

        return balance;
      };

      const [last10MatchesBalance, ledgerEntriesBalance] = await Promise.all([
        calculateBalance(last10Matches),
        calculateBalance(ledgerEntries),
      ]);

      const balance = last10MatchesBalance + ledgerEntriesBalance;

      return balance;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async calculateUserExpo(userId) {
    try {
      const user = await User.findOne({ username: userId }).lean().exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return res.send({ msg: "User not found" });
      }

      const userCreationDate = user.createdOn;
      const myMatchShare = user.matchShare;
      const companyShare = 100 - myMatchShare;
      const [last10Matches, ledgerEntries] = await Promise.all([
        MatchList.find({}).lean().exec(),
        Ledger.find({
          $or: [{ setter: userId }, { getter: userId }],
        })
          .lean()
          .exec(),
      ]);

      const calculateBalance = async (entries) => {
        let balance = 0;

        await Promise.all(
          entries.map(async (match) => {
            const matchDate = match.time
              ? new Date(match.time)
              : new Date(match.createdOn);

            if (matchDate < userCreationDate) return;

            if (match.eventId) {
              const bets = await BetUserMap.find({
                matchId: match.eventId,
                company: userId,
                settled: true,
              })
                .lean()
                .exec();

              const totalBalance = await calculateCompanyExpo(
                bets,
                companyShare
              );
              balance += totalBalance;
            } else {
              let totalBalance = 0;
              if (match.getter === userId) {
                totalBalance += match.value;
              } else {
                totalBalance -= match.value;
              }
              balance += totalBalance;
            }
          })
        );

        return balance;
      };

      const [last10MatchesBalance, ledgerEntriesBalance] = await Promise.all([
        calculateBalance(last10Matches),
        calculateBalance(ledgerEntries),
      ]);
      const balance = last10MatchesBalance + ledgerEntriesBalance;

      return balance;
    } catch (error) {
      console.error("Error fetching data:", error);
      return 0;
    }
  },
  async calculateUserExpoWithoutResult(userId) {
    try {
      const user = await User.findOne({ username: userId }).lean().exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }

      const userCreationDate = user.createdOn;
      const myMatchShare = user.matchShare;
      const companyShare = 100 - myMatchShare;
      const [last10Matches] = await Promise.all([
        MatchList.find({}).lean().exec(),
        Ledger.find({
          $or: [{ setter: userId }, { getter: userId }],
        })
          .lean()
          .exec(),
      ]);

      const calculateBalance = async (entries) => {
        let balance = 0;

        await Promise.all(
          entries.map(async (match) => {
            const matchDate = match.time
              ? new Date(match.time)
              : new Date(match.createdOn);

            if (matchDate < userCreationDate) return;

            if (match.eventId) {
              const bets = await BetUserMap.find({
                matchId: match.eventId,
                company: userId,
                settled: true,
              })
                .lean()
                .exec();

              const totalBalance = await calculateCompanyExpo(
                bets,
                companyShare
              );
              balance += totalBalance;
            } else {
              let totalBalance = 0;
              if (match.getter === userId) {
                totalBalance += match.value;
              } else {
                totalBalance -= match.value;
              }
              balance += totalBalance;
            }
          })
        );

        return balance;
      };

      const [last10MatchesBalance] = await Promise.all([
        calculateBalance(last10Matches),
      ]);

      const balance = last10MatchesBalance;

      return balance;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async matchLedger(userId, startDate, endDate) {
    try {
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
      }).sort({ time: 1 });

      const resultArray = [];
      let balance = 0;
      let i = 0;
      for (const match of last10Matches) {
        const matchObj = {
          matchId: match.eventId,
          matchName: match.eventName,
          totalProfitLoss: 0,
          startTime: match.time,
        };
        // Find all bets related to the current match and user
        const bets = await BetUserMap.find({
          matchId: match.eventId,
          company: userId,
          settled: true,
        });
        let totalBalance = 0;
        if (match.createdOn > userCreationDate || bets.length > 0) {
          // Calculate total profit/loss for the current match and user
          for (const bet of bets) {
            if (bet.settled) {
              if (bet.won) {
                const maxLoss =
                  bet.name === "matchbet" || bet.name === "tossbet"
                    ? bet.isBack
                      ? (bet.stake * bet.odds) / 100
                      : bet.stake
                    : bet.name === "sessionbet"
                    ? bet.priceValue > 1
                      ? bet.stake
                      : bet.stake * bet.priceValue
                    : 0;
                const companyShare = 100 - user.matchShare;
                const lossAmount = (maxLoss * companyShare) / 100;
                const companyCom =
                  (((bet.stake * 3) / 100) * companyShare) / 100;

                totalBalance -=
                  lossAmount +
                  (bet.name === "sessionbet"
                    ? companyCom + bet.sessionCommission
                    : 0);
              } else {
                const maxProfit =
                  bet.name === "matchbet" || bet.name === "tossbet"
                    ? bet.isBack
                      ? bet.stake
                      : (bet.stake * bet.odds) / 100
                    : bet.name === "sessionbet"
                    ? bet.priceValue > 1
                      ? bet.stake * bet.priceValue
                      : bet.stake
                    : 0;
                const companyShare = 100 - user.matchShare;
                const profitAmount = (maxProfit * companyShare) / 100;
                const companyCom =
                  (((bet.stake * 3) / 100) * companyShare) / 100;

                totalBalance +=
                  profitAmount +
                  (bet.name === "sessionbet"
                    ? companyCom + bet.sessionCommission
                    : -(profitAmount * bet.commissionPercentage) / 100);
              }
            }
          }

          // Update the balance for this match by adding the totalProfitLoss
          matchObj.totalProfitLoss = totalBalance;
          balance += totalBalance;
          matchObj.balance = balance;
          matchObj.i = i;
          i++;
          resultArray.push(matchObj);
        }
      }
      return resultArray;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async cashLedger(userId, startDate, endDate) {
    try {
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }

      const ledgerEntries = await Ledger.find({
        $or: [{ setter: userId }, { getter: userId }],
        createdOn: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const resultArray = [];
      let i = 0;
      for (const match of ledgerEntries) {
        let totalBalance = 0;
        const matchObj = {
          matchId: match._id,
          matchName: match.getter === userId ? "Cash Received" : "Cash Paid",
          totalProfitLoss: 0,
          startTime: match.createdOn,
          balance: match.getterPreviousLimit,
          note: match.note,
        };

        // Determine if the entry is Cash Received or Cash Paid
        if (match.getter === userId) {
          totalBalance += match.value;
        } else {
          totalBalance -= match.value;
        }
        matchObj.totalProfitLoss = totalBalance;
        matchObj.balance += totalBalance;
        matchObj.i = i;
        i++;
        resultArray.push(matchObj);
      }

      return resultArray;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async getReportByUserId(req, res) {
    const { userId } = req.params;
    const resultArray = await BetController.getCompanyExp(userId);
    res.send(resultArray);
  },

  async getMatchAllBets(req, res) {
    const { matchId } = req.params;
    const userId = req.user.username;
    try {
      const bets = await BetUserMap.find({
        matchId: matchId,
        company: userId,
        name: "matchbet",
      }).lean();

      res.send(bets);
    } catch (error) {
      console.error(error);
      res.send("Internal server error");
    }
  },
  async getMatchBetPosition(req, res) {
    const userId = req.user.username;
    const { matchId } = req.params;
    const data = await MatchBetMap.find({ matchId: matchId, userId: userId });
    res.send(data);
  },
  async getTossBetPosition(req, res) {
    const userId = req.user.username;
    const { matchId } = req.params;
    const data = await TossBet.find({ matchId: matchId, userId: userId });
    res.send(data);
  },

  async getDeclaredSession(req, res) {
    try {
      const userId = req.user.username;
      const { matchId } = req.params;
      const bets = await BetUserMap.find({
        company: userId,
        matchId,
        settled: true,
        name: "sessionbet",
      });
      const arr = [];
      for (let i = 0; i < bets.length; i++) {
        const row = bets[i];
        const {
          won,
          fancyName,
          profitAmount,
          lossAmount,
          sessionCommission,
          myCom,
          createdOn,
        } = row;
        if (!arr.some((x) => x.fancyName === row.fancyName)) {
          const result = row.result
            ? row.result
            : row.result === 0
            ? 0
            : "No Result";
          const sum = won ? -lossAmount : profitAmount;
          const elem = {
            fancyName,
            result,
            createdOn,
            sum: sum + sessionCommission - Math.abs(myCom),
          };
          arr.push(elem);
        } else {
          const sum = won ? -lossAmount : profitAmount;
          arr.filter((x) => x.fancyName === fancyName)[0].sum +=
            sum + sessionCommission - Math.abs(myCom);
        }
      }
      return res.send(arr);
    } catch (error) {
      console.error(error);
      return res.send({ status: 0, msg: "Server Error" });
    }
  },
  async getMarketPosition(req, res) {
    const userId = req.user.username;
    const { matchId } = req.params;
    const bets = await BetUserMap.find({
      company: userId,
      matchId,
      settled: true,
      name: "sessionbet",
    });
  },
  async getBetUsingUserId(req, res) {
    const { matchId } = req.params;
    const userId = req.user.username;
    const data = await BetController.getMyPlayerSessionBets(matchId, userId);
    res.send(data);
  },
  async getMyPlayerBets(matchId, userId) {
    const userRef = await BetUserMap.find({
      matchId: matchId,
      company: userId,
    });
    return userRef;
  },
  async getMyPlayerSessionBets(matchId, userId) {
    const userRef = await BetUserMap.find({
      matchId: matchId,
      company: userId,
      name: "sessionbet",
    });
    return userRef;
  },
  async getAllMyClientBets(matchId, userId) {
    let userRef;
    if (matchId === "all") {
      userRef = await BetUserMap.find({ player: userId, settled: true });
    } else {
      userRef = await BetUserMap.find({
        matchId,
        player: userId,
        settled: true,
      });
    }

    return userRef;
  },
  async getAllMatchBets(userId) {
    const userRef = BetUser.find({ company: userId, settled: true });

    try {
      const data = await userRef.exec();
      return data;
    } catch (error) {
      return;
    }
  },
  async getMyPlayerAllBets(matchId, userId) {
    const query =
      matchId !== "all"
        ? { company: userId, settled: true, matchId }
        : { company: userId, settled: true };
    const data = await BetUserMap.find(query).lean().exec();
    return data;
  },
  async getDetailedMatchBets(req, res) {
    const { matchId } = req.params;
    try {
      const data = await BetDataMap.find({ matchId: matchId });
      res.send(data);
    } catch (error) {
      console.error(error);
      res.send("Server error");
    }
  },
  async getAllBets(socket) {
    try {
      const bets = await BetDataMap.aggregate([
        { $match: { settled: false } },
        {
          $group: {
            _id: "$fancyName",
            matchId: { $first: "$matchId" },
          },
        },
        {
          $project: {
            _id: 0,
            fancyName: "$_id",
            matchId: 1,
          },
        },
        {
          $sort: {
            fancyName: 1, // Sort in ascending order
          },
        },
      ]);

      socket.emit("allBets", bets);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Internal server error");
    }
  },
  // async getAllTossBets(req, res) {
  //   const level = removeNum(req.user.username);
  //   if (level === "cc") {
  //     const bets = await TossBet.find({ settled: { $ne: true } });
  //     const arr = [];
  //     bets.forEach((bet) => {
  //       if (!arr.some((e) => e.matchId === bet.matchId)) {
  //         arr.push({
  //           runnerArray: bet.runnerArray,
  //           matchId: bet.matchId,
  //         });
  //       }
  //     });
  //     res.send(arr);
  //   }
  // },

  async getAllMatchTossBets(req, res) {
    const { matchId } = req.params;
    const userId = req.user.username;
    const data = await BetUserMap.find({
      matchId: matchId,
      company: userId,
      name: "tossbet",
    }).exec();
    res.send(data);
  },
  async myAgentBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const arr = await getMyAgents(username);
    const dataArr = [];
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];
      var data = [];
      data = await BetController.getMyPlayerAllBets(matchId, arrData.username);
      var matchSum = 0;
      var sessionSum = 0;
      var sCom = 0;
      for (var j = 0; j < data.length; j++) {
        const val = data[j];
        if (val.name === "sessionbet") {
          if (val.won && val.won === true) {
            var totalSSum =
              val.priceValue > 1 ? val.stake : val.stake * val.priceValue;
            sessionSum -= totalSSum;
            sCom += (totalSSum * 3) / 100;
          } else {
            var totalSSum =
              val.priceValue > 1 ? val.stake * val.priceValue : val.stake;
            sessionSum += totalSSum;
            sCom += (totalSSum * 3) / 100;
          }
        } else if (val.name === "matchbet" || val.name === "tossbet") {
          if (val.won) {
            var totalMSum = val.isBack
              ? (val.stake * val.odds) / 100
              : val.stake;
            matchSum -= totalMSum;
          } else {
            var totalMSum = val.isBack
              ? val.stake
              : (val.stake * val.odds) / 100;
            matchSum += totalMSum;
          }
        }
      }
      const mCom = matchSum > 0 ? Math.abs((matchSum * 3) / 100) : 0;
      const matchShare = arrData.matchShare ? arrData.matchShare : 0;
      const net = sessionSum + matchSum - mCom - sCom;
      const agentShare = (net * matchShare) / 100;
      const final = (agentShare - net) * -1;

      const inf = {
        name: arrData.name,
        username: arrData.username,
        matchSum: Math.round(matchSum * 100) / 100,
        sessionSum: Math.round(sessionSum * 100) / 100,
        total: Math.round((sessionSum + matchSum) * 100) / 100,
        matchCommission: Math.round(mCom * 100) / 100,
        sessionCommission: Math.round(sCom * 100) / 100,
        totalCommission: Math.round((mCom + sCom) * 100) / 100,
        net: Math.round(net * 100) / 100,
        agentShare: Math.round(agentShare * 100) / 100,
        others: 0,
        final: Math.round(final * 100) / 100,
      };
      dataArr.push(inf);
    }
    res.send(dataArr);
  },
  async getExposure(req, res) {
    const { username } = req.params;
    var exposure;
    if (removeNum(username) === "sp") {
      exposure = await BetController.getPlayerExposure("all", username);
    } else {
      exposure = await BetController.getAgentExposure("all", username);
    }
    res.send(exposure);
  },
  async getPlayerExposure(matchId, username) {
    const arrData = await getUserInformation(username);
    const data = await BetController.getAllMyClientBets(matchId, username);
    var matchSum = 0;
    var sessionSum = 0;
    var sCom = 0;
    var mCom = 0;
    for (var j = 0; j < data.length; j++) {
      const val = data[j];
      if (val.name === "sessionbet") {
        if (val.won && val.won === true) {
          var totalSSum = val.lossAmount;
          sessionSum -= totalSSum;
        } else {
          var totalSSum = val.profitAmount;
          sessionSum += totalSSum;
        }
      } else if (val.name === "matchbet" || val.name === "tossbet") {
        if (val.won) {
          var totalMSum = val.lossAmount;
          matchSum -= totalMSum;
        } else {
          var totalMSum = val.profitAmount;
          matchSum += totalMSum;
        }
      }
    }

    const matchShare = arrData.matchShare ? arrData.matchShare : 0;
    const net = sessionSum + matchSum - mCom - sCom;
    const agentShare = (net * matchShare) / 100;
    const final = (agentShare - net) * -1;
    const inf = {
      name: arrData.name,
      username: arrData.username,
      final: Math.round(final * 100) / 100,
    };
    return inf;
  },
  async getAgentExposure(matchId, username) {
    const arrData = await getUserInformation(username);
    const data = await BetController.getMyPlayerAllBets(matchId, username);
    var matchSum = 0;
    var sessionSum = 0;
    var sCom = 0;
    var mCom = 0;
    for (var j = 0; j < data.length; j++) {
      const val = data[j];
      if (val.name === "sessionbet") {
        if (val.won && val.won === true) {
          var totalSSum =
            val.priceValue > 1 ? val.stake : val.stake * val.priceValue;
          sessionSum -= totalSSum;
          sCom += val.sessionCommission;
        } else {
          var totalSSum =
            val.priceValue > 1 ? val.stake * val.priceValue : val.stake;
          sessionSum += totalSSum;
          sCom += val.sessionCommission;
        }
      } else if (val.name === "matchbet" || val.name === "tossbet") {
        if (val.won) {
          var totalMSum = val.isBack ? (val.stake * val.odds) / 100 : val.stake;
          matchSum -= totalMSum;
        } else {
          var totalMSum = val.isBack ? val.stake : (val.stake * val.odds) / 100;
          matchSum += totalMSum;
          mCom += Math.abs((totalMSum * 3) / 100);
        }
      }
    }
    const matchShare = arrData.matchShare ? arrData.matchShare : 0;
    const net = sessionSum + matchSum - mCom - sCom;
    const agentShare = (net * matchShare) / 100;
    const final = net - agentShare;

    const inf = {
      name: arrData.name,
      username: arrData.username,
      final,
    };
    return inf;
  },
  async playerCollection(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const arr = await getMyAgents(username);
    const dataArr = [];
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];
      const inf = await BetController.getPlayerExposure(
        matchId,
        arrData.username
      );
      const cash = await countCash(arrData.username);
      inf.final = inf.final + cash;
      dataArr.push(inf);
    }
    res.send(dataArr);
  },
  async myPlayerBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const arr = await getMyAgents(username);
    const dataArr = [];
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];
      var data = [];
      data = await BetController.getAllMyClientBets(matchId, arrData.username);
      var matchSum = 0;
      var sessionSum = 0;
      var sessionStake = 0;
      var sCom = 0;
      for (var j = 0; j < data.length; j++) {
        const val = data[j];
        if (val.name === "sessionbet") {
          var stake =
            val.priceValue > 1 ? val.stake : val.stake * val.priceValue;
          sessionStake += stake;
          if (val.won && val.won === true) {
            var totalSSum = val.lossAmount;
            sessionSum -= totalSSum;
          } else {
            var totalSSum = val.profitAmount;
            sessionSum += totalSSum;
          }
        } else if (val.name === "matchbet" || val.name === "tossbet") {
          if (val.won) {
            var totalMSum = val.lossAmount;
            matchSum -= totalMSum;
          } else {
            var totalMSum = val.profitAmount;
            matchSum += totalMSum;
          }
        }
      }
      const mCom = matchSum > 0 ? (matchSum * 3) / 100 : 0;
      const matchShare = arrData.matchShare ? arrData.matchShare : 0;
      const net = sessionSum + matchSum - mCom - sCom;
      const agentShare = (net * matchShare) / 100;
      const final = (agentShare - net) * -1;
      const inf = {
        name: arrData.name,
        username: arrData.username,
        matchSum: Math.round(matchSum * 100) / 100,
        sessionSum: Math.round(sessionSum * 100) / 100,
        total: Math.round((sessionSum + matchSum) * 100) / 100,
        matchCommission: Math.round(mCom * 100) / 100,
        sessionCommission: Math.round(sCom * 100) / 100,
        totalCommission: Math.round((mCom + sCom) * 100) / 100,
        net: Math.round(net * 100) / 100,
        agentShare: Math.round(agentShare * 100) / 100,
        others: 0,
        final: Math.round(final * 100) / 100,
      };
      dataArr.push(inf);
    }
    res.send(dataArr);
  },
  async myPlayerCollection(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const arr = await getMyAgents(username);
    const dataArr = [];
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];

      var data = [];
      data = await BetController.getMyPlayerAllBets(matchId, arrData.username);

      var matchSum = 0;
      var sessionSum = 0;
      var sCom = 0;
      var mCom = 0;
      for (var j = 0; j < data.length; j++) {
        const val = data[j];
        const adminShare = val.adminShare;
        if (val.name === "sessionbet") {
          if (val.won && val.won === true) {
            var totalSSum = (val.lossAmount * 10000) / (103 * adminShare);
            sessionSum -= totalSSum;
            sCom += Math.abs((totalSSum * 3) / 100);
          } else {
            var totalSSum = (val.profitAmount * 10000) / (97 * adminShare);
            sessionSum += totalSSum;
            sCom += Math.abs((totalSSum * 3) / 100);
          }
        } else if (val.name === "matchbet" || val.name === "tossbet") {
          if (val.won) {
            var totalMSum = (val.lossAmount * 10000) / (103 * adminShare);
            matchSum -= totalMSum;
            mCom += Math.abs((totalMSum * 3) / 100);
          } else {
            var totalMSum = (val.profitAmount * 10000) / (97 * adminShare);
            matchSum += totalMSum;
            mCom += Math.abs((totalMSum * 3) / 100);
          }
        }
      }

      const matchShare = arrData.matchShare ? arrData.matchShare : 0;
      const net = sessionSum + matchSum - mCom - sCom;
      const agentShare = (net * matchShare) / 100;
      const final = (agentShare - net) * -1;
      const inf = {
        name: arrData.name,
        username: arrData.username,
        final,
      };
      dataArr.push(inf);
    }
    res.send(dataArr);
  },

  async agentSessionEarning(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const arr = await getMyAgents(username);
    const dataArr = [];
    var share;
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];
      share = arrData.matchShare;
      var data = [];
      if (arrData.level === 6) {
        data = await BetController.getAllMyClientBets(
          matchId,
          arrData.username
        );
      } else {
        data = await BetController.getMyPlayerAllBets(
          matchId,
          arrData.username
        );
      }
      var sessionSum = 0;
      var sCom = 0;
      for (var j = 0; j < data.length; j++) {
        const val = data[j];
        if (arrData.level === 6) {
          if (val.name === "sessionbet") {
            if (val.won && val.won === true) {
              var totalSSum = val.lossAmount;
              sessionSum -= totalSSum;
            } else {
              var totalSSum = val.profitAmount;
              sessionSum += totalSSum;
            }
          }
        } else {
          if (val.name === "sessionbet") {
            if (val.won && val.won === true) {
              var totalSSum =
                val.priceValue > 1 ? val.stake : val.stake * val.priceValue;
              sessionSum -= totalSSum;
              sCom += val.sessionCommission;
            } else {
              var totalSSum =
                val.priceValue > 1 ? val.stake * val.priceValue : val.stake;
              sessionSum += totalSSum;
              sCom += val.sessionCommission;
            }
          }
        }
      }

      const inf = {
        name: arrData.name,
        share,
        username: arrData.username,
        sessionSum: Math.round(sessionSum * 100) / 100,
        sessionCommission: Math.round(sCom * 100) / 100,
        total: Math.round((sessionSum - sCom) * 100) / 100,
      };
      if (inf.sessionSum !== 0 || inf.sessionCommission !== 0) {
        dataArr.push(inf);
      }
    }
    res.send(dataArr);
  },
  async myClientCollection(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    try {
      const docs = await BetUserMap.find({
        matchId,
        company: username,
        settled: true,
      });
      const arr = [];
      docs.forEach((doc) => {
        const row = doc.toObject();
        const rate = row.priceValue > 1 ? row.priceValue : 1;
        if (row.name === "sessionbet") {
          if (arr.some((x) => x.player === row.player)) {
            arr.filter((x) => x.player === row.player)[0].sessionStake +=
              row.stake * rate;
            if (row.won && row.won === true) {
              var totalSSum =
                row.priceValue > 1 ? row.stake : row.stake * row.priceValue;
              arr.filter((x) => x.player === row.player)[0].sessionSum -=
                totalSSum;
            } else {
              var totalSSum =
                row.priceValue > 1 ? row.stake * row.priceValue : row.stake;
              arr.filter((x) => x.player === row.player)[0].sessionSum +=
                totalSSum;
            }
          } else {
            var sessionSum = 0;
            var matchStake = 0;
            var matchSum = 0;
            const sessionStake = row.stake * rate;
            if (row.won && row.won === true) {
              var totalSSum =
                row.priceValue > 1 ? row.stake : row.stake * row.priceValue;
              sessionSum -= totalSSum;
            } else {
              var totalSSum =
                row.priceValue > 1 ? row.stake * row.priceValue : row.stake;

              sessionSum += totalSSum;
            }
            const inf = {
              player: row.player,
              sessionSum,
              sessionStake,
              matchStake,
              matchSum,
              adminShare: row.adminShare,
              pname: row.pname ? row.pname : "",
            };
            arr.push(inf);
          }
        } else if (row.name === "matchbet" || row.name === "tossbet") {
          const { isBack } = row;
          const amount = isBack ? row.stake : (row.stake * row.odds) / 100;
          if (arr.some((x) => x.player === row.player)) {
            arr.filter((x) => x.player === row.player)[0].matchStake += amount;
            if (row.won && row.won === true) {
              var totalMSum = isBack ? (row.stake * row.odds) / 100 : row.stake;
              arr.filter((x) => x.player === row.player)[0].matchSum -=
                totalMSum;
            } else {
              var totalMSum = isBack ? row.stake : (row.stake * row.odds) / 100;
              arr.filter((x) => x.player === row.player)[0].matchSum +=
                totalMSum;
            }
          } else {
            var matchSum = 0;
            var sessionStake = 0;
            var sessionSum = 0;
            const matchStake = amount;
            if (row.won) {
              var totalMSum = isBack ? (row.stake * row.odds) / 100 : row.stake;
              matchSum -= totalMSum;
            } else {
              var totalMSum = isBack ? row.stake : (row.stake * row.odds) / 100;
              matchSum += totalMSum;
            }
            const inf = {
              player: row.player,
              matchSum,
              sessionStake,
              sessionSum,
              matchStake,
              adminShare: row.adminShare,
              pname: row.pname ? row.pname : "",
            };
            arr.push(inf);
          }
        }
      });
      res.send(arr);
    } catch (error) {
      console.error(error);
      res.send("Internal Server Error");
    }
  },
  async getCompanyReport(req, res) {
    const { matchId, username } = req.body;
    const out = await clientCollection(matchId, username);
    res.send(out);
  },
  async getLiveBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const data = await BetDataMap.find({ matchId, userId: username });
    res.send(data);
  },
  async getMatchLedger(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const data = await MatchBetMap.find({
      matchId,
      userId: username,
    });
    const tossData = await TossBet.find({
      matchId,
      userId: username,
    });
    res.send({ matchData: data, tossData });
  },
  // async getTossLedger(req, res) {
  //   const { matchId } = req.params;
  //   const username = req.user.username;
  //   const data = await TossBetMap.find({
  //     matchId,
  //     userId: username,
  //     settled: true,
  //   });
  //   res.send(data);
  // },
  async getTossBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.username;
    const data = await TossBet.find({ matchId, userId: username });
    res.send(data);
  },
  roundOff(data) {
    const nRate = (Math.round((data / 100) * 100) / 100).toFixed(2);
    return nRate;
  },
  async placeMatchBet(req, res) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const username = req.user.username;
      const { stake, isBack, selectionName, matchId } = req.body;
      var odds = req.body.odds;
      var priceValue = req.body.priceValue;
      if (
        stake === undefined ||
        isBack === undefined ||
        priceValue === undefined ||
        odds === undefined ||
        selectionName === undefined ||
        matchId === undefined
      ) {
        console.log(
          `${stake}=${stake === undefined}\n${isBack}=${
            isBack === undefined
          }\n${priceValue}=${priceValue === undefined}\n${odds}=${
            odds === undefined
          }\n${selectionName}=${selectionName === undefined}
          \n${matchId}=${matchId === undefined}\n${sportId}=${
            sportId === undefined
          }
       `
        );
        return res.send({ msg: "Insufficient data recieved!" });
      }
      if (stake < 100) {
        return res.send({
          msg: "The amount cannot be less than 100",
          status: 0,
        });
      }
      if (stake > 50000) {
        return res.send({
          msg: "The amount cannot be greater than 50000",
          status: 0,
        });
      }
      const sportId = 4;
      const response = await apiSwitch(matchId);
      const matchInfo = await MatchList.findOne({ eventId: matchId }).exec();
      if (!matchInfo.eventName) {
        return res.send({ msg: "Match not found", status: 0 });
      }
      const matchname = matchInfo.eventName;
      const market = matchInfo.markets.filter(
        (x) => x.marketName === "Match Odds"
      )[0];
      const runners = market.runners;
      const selection = runners.filter(
        (x) => x.selectionName === selectionName
      );
      if (selection.length === 0) {
        return res.send({ msg: "Invalid Selection Name.", status: 0 });
      }
      const runnerArray = [];
      var selectionId;
      if (
        runners.filter((x) => x.selectionName === selectionName).length === 0
      ) {
        return;
      }
      if (response.status) {
        if (response.data.BMmarket && response.data.BMmarket.bm1 && runners) {
          selectionId = runners.filter(
            (x) => x.selectionName === selectionName
          )[0].selectionId;
          for (var i = 0; i < runners.length; i++) {
            const object = {
              runner: runners[i].selectionName,
              sid: runners[i].selectionId,
            };
            runnerArray.push(object);
          }
        } else return;
        if (response.data.BMmarket && response.data.BMmarket.bm1) {
          let resp = response.data.BMmarket.bm1;
          const matchBetData = await MatchBetMap.find({
            matchId: matchId,
            userId: username,
          }).lean();
          const totalCoins = await CoinController.countCoin(
            username.toLowerCase()
          );
          let transactionId;
          let coin;
          let transactionData;
          let matchVal;
          if (matchBetData.length > 0) {
            transactionId = matchBetData[0].transactionId;
            coin = await CoinMap.findOne({ _id: transactionId });
            transactionData = coin.toObject();
            matchVal = coin ? transactionData.value : 0;
          } else {
            matchVal = 0;
          }
          const betObj = {
            userId: username,
            stake: stake,
            isBack: isBack,
            isLay: !isBack,
            selectionId: selectionId,
            priceValue,
            odds,
            matchname,
            selectionName,
            matchId,
            sportId: 4,
            settled: false,
            pname: req.user.name,
            createdOn: Date.now(),
          };
          matchBetData.push(betObj);
          const posRes = positionCalculator(matchBetData, resp);
          let negativeSum = 0;
          for (let i = 0; i < posRes.length; i++) {
            if (posRes[i].position && posRes[i].position < 0) {
              if (negativeSum > posRes[i].position) {
                negativeSum = posRes[i].position;
              }
            }
          }
          if (totalCoins + matchVal < Math.abs(negativeSum)) {
            return res.send({ msg: "Insufficient Balance", status: 0 });
          }
          for (var i = 0; i < runnerArray.length; i++) {
            runnerArray[i].back = resp.filter(
              (x) => x.nat === runnerArray[i].runner
            )[0].b1;
            runnerArray[i].lay = resp.filter(
              (x) => x.nat === runnerArray[i].runner
            )[0].l1;
          }
          const currentData = response.data.BMmarket.bm1.filter(
            (x) => x.nat === selectionName
          );
          const filteredOdds = currentData.filter(
            (x) =>
              (isBack && parseFloat(x.b1) >= parseFloat(odds)) ||
              (!isBack && parseFloat(x.l1) <= parseFloat(odds))
          );

          if (
            filteredOdds.length &&
            (parseFloat(filteredOdds[0].l1) > 0 ||
              parseFloat(filteredOdds[0].b1) > 0)
          ) {
            if (isBack && parseFloat(filteredOdds[0].b1) >= parseFloat(odds)) {
              odds = filteredOdds[0].b1;
              priceValue = filteredOdds[0].b1;
            } else if (
              !isBack &&
              parseFloat(filteredOdds[0].l1) <= parseFloat(odds)
            ) {
              odds = filteredOdds[0].l1;
              priceValue = filteredOdds[0].l1;
            } else {
              return res.send({ msg: "Bhav changed!", status: 0 });
            }
            const username = req.user.username;
            const matchBetRef = await MatchBetMap.find({
              matchId: matchId,
              userId: username,
            });
            const betData = matchBetRef.map((doc) => doc.toObject());
            var docId;
            let newArr = [];
            if (betData.length > 0) {
              const bData = {
                userId: username,
                stake,
                isBack,
                isLay: !isBack,
                selectionId,
                transactionId: betData[0].transactionId,
                priceValue,
                odds,
                selectionName,
                matchname,
                matchId,
                sportId,
                runnerArray,
                settled: false,
                pname: req.user.name,
                createdOn: Date.now(),
              };
              const matchBetMap = new MatchBetMap(bData);
              await matchBetMap.save();
              const matchBetData = await MatchBetMap.find({
                matchId: matchId,
                userId: username,
              }).lean();
              resp = positionCalculator(matchBetData, resp);
              let negativeSum = 0;
              for (let i = 0; i < resp.length; i++) {
                if (resp[i].position && resp[i].position < 0) {
                  if (negativeSum > resp[i].position) {
                    negativeSum = resp[i].position;
                  }
                }
              }
              newArr = resp.map(({ nat, position }) => ({
                nat,
                position,
              }));
              for (let i = 0; i < newArr.length; i++) {
                const sid = runnerArray.filter(
                  (x) => x.runner === newArr[i].nat
                )[0].sid;
                newArr[i].sid = sid;
              }
              const changeAmount = Math.abs(
                negativeSum !== null ? negativeSum : 0
              );
              const coin = await CoinMap.findOne({
                _id: betData[0].transactionId,
              });
              if (!coin) {
                throw new Error("Coin not found"); // handle error appropriately
              }
              coin.value = parseFloat(changeAmount);
              coin.newArr = newArr;
              coin.lastUpdated = Date.now();
              await coin.save();
            } else {
              docId = new ObjectId();
              const betData = {
                userId: username,
                stake,
                isBack,
                isLay: !isBack,
                transactionId: docId.toString(),
                priceValue,
                odds,
                selectionId,
                runnerArray,
                selectionName,
                matchname,
                matchId,
                pname: req.user.name,
                sportId,
                settled: false,
                createdOn: Date.now(),
              };
              const betDb = new MatchBetMap(betData); // create a new document with the bet data
              await betDb.save(); // save the document to the database
              const matchBetData = await MatchBetMap.find({
                matchId: matchId,
                userId: username,
              }).lean();
              resp = positionCalculator(matchBetData, resp);

              newArr = resp.map(({ nat, position }) => ({
                nat,
                position,
              }));
              for (let i = 0; i < newArr.length; i++) {
                const sid = runnerArray.filter(
                  (x) => x.runner === newArr[i].nat
                )[0].sid;
                newArr[i].sid = sid;
              }
              const amount = isBack ? stake : (priceValue * stake) / 100;
              const type = 2;
              const msg = `Bet placed of ${stake} coins on ${selectionName}`;
              const coinMap = new CoinMap({
                _id: docId,
                value: parseFloat(amount),
                msg: msg,
                type: type,
                newArr,
                matchId,
                setter: username.toLowerCase(),
                createdOn: Date.now(),
              });
              await coinMap.save();
            }
            const loss = isBack ? stake : Math.round(stake * odds) / 100;
            const profit = isBack ? Math.round(stake * odds) / 100 : stake;
            const profitList = await CommissionController.disburseMatchCoin(
              username,
              profit * -1
            );
            const lossList = await CommissionController.disburseMatchCoin(
              username,
              loss
            );
            for (var i = 0; i < profitList.length; i++) {
              const { id, commission, percent, commissionPercentage } =
                profitList[i];
              const profitAmount = Math.abs(
                lossList.filter((x) => x.id === id)[0].commission
              );
              if (id !== username) {
                const betUserMap = new BetUserMap({
                  name: "matchbet",
                  company: id,
                  commissionPercentage,
                  player: username,
                  lossAmount: Math.abs(commission),
                  profitAmount,
                  selectionId,
                  stake: stake,
                  isBack: isBack,
                  isLay: !isBack,
                  priceValue: priceValue,
                  odds: odds,
                  selectionName: selectionName,
                  matchname: matchname,
                  matchId,
                  sportId,
                  settled: false,
                  adminShare: percent,
                  pname: req.user.name,
                  runnerArray,
                  createdOn: Date.now(),
                });

                betUserMap.save();
              }
            }
            countAndUpdateCoin(username);
            res.send({ msg: "Bet Placed Successfully!", status: 1 });
          } else {
            res.send({ msg: "Bhav Changed.", status: 0 });
          }
        }
      } else {
        res.send({ msg: "Match Closed!", status: 0 });
      }
    } catch (err) {
      console.error(err);
      res.send({ msg: "System Error", status: 0 });
    }
  },
  replaceAll(string, obj) {
    var retStr = string;
    for (var x in obj) {
      retStr = retStr.replace(new RegExp(x, "g"), obj[x]);
    }
    return retStr;
  },

  convertTimeStamp(x) {
    if (x) {
      const timestamp = new Date(
        BetController.replaceAll(x.split("/")[1], { PM: " PM", AM: " AM" })
      );
      const twoHoursBefore = timestamp - 1.5 * 60 * 60 * 1000;

      return twoHoursBefore;
    }
    return;
  },
  async placeTossBet(req, res) {
    try {
      const { stake, isBack, selectionName, matchId } = req.body;
      if (
        stake === undefined ||
        isBack === undefined ||
        selectionName === undefined ||
        matchId === undefined
      ) {
        return res.send({ msg: "Insufficient data recieved!" });
      }
      if (stake < 100) {
        return res.send({
          msg: "The amount cannot be less than 100",
          status: 0,
        });
      }
      if (stake > 50000) {
        return res.send({
          msg: "The amount cannot be greater than 50000",
          status: 0,
        });
      }
      const priceValue = 95;
      const amount = isBack ? (priceValue * stake) / 100 : stake;
      if (amount <= 0) {
        return res.send({ msg: "Invalid Amount", status: 0 });
      } else {
        const url = "https://111111.info/pad=82/listGames?sport=4";
        const response = await axios.get(url);
        if (!response.data.result) {
          return res.send({ msg: "No Match Found!", status: 0 });
        }
        const matchList = response.data.result.filter(
          (x) => parseInt(x.eventId) === parseInt(matchId)
        );
        if (matchList.length === 0) {
          return res.send({ msg: "No Match Found!", status: 0 });
        }
        const matchDetails = matchList[0];
        const matchname = matchDetails.eventName;
        const tossBet = matchDetails.markets.filter(
          (x) => x.marketName === "To Win the Toss"
        );
        if (tossBet.length === 0) {
          return res.send({ msg: "Toss Not Active", status: 0 });
        }
        const timestamp = new Date(matchDetails.time);
        const twoHoursBefore = timestamp - 2 * 60 * 60 * 1000;
        const runnerArray = tossBet[0].runners;
        let resp = [];

        for (var i = 0; i < runnerArray.length; i++) {
          const data = {
            nat: runnerArray[i].selectionName,
            back: 95,
            lay: 0,
          };
          resp.push(data);
        }
        const selection = runnerArray.filter(
          (x) => x.selectionName === selectionName
        );
        const selectionId = selection[0].selectionId;
        if (selection.length === 0) {
          return res.send({ msg: "Invalid Selection Name.", status: 0 });
        }
        if (
          twoHoursBefore <= Date.now() ||
          !tossBet[0].open ||
          !tossBet[0].status ||
          !tossBet[0].status ||
          !tossBet[0].isInPlay ||
          tossBet[0].betDelay
        ) {
          return res.send({ msg: "Toss Not Active", status: 0 });
        }
        const sportId = 4;
        const username = req.user.username;
        const betInfo = await TossBet.find({
          matchId,
          userId: username,
        }).lean();
        const totalCoins = await CoinController.countCoin(
          username.toLowerCase()
        );

        let transactionId;
        let coin;
        let transactionData;
        let matchVal;
        if (betInfo.length > 0) {
          transactionId = betInfo[0].transactionId;
          coin = await CoinMap.findOne({ _id: transactionId });
          transactionData = coin.toObject();
          matchVal = coin ? transactionData.value : 0;
        } else {
          matchVal = 0;
        }
        const betObj = {
          userId: username,
          stake: stake,
          isBack: isBack,
          isLay: !isBack,
          selectionId: selectionId,
          priceValue,
          odds: priceValue,
          matchname,
          selectionName,
          matchId,
          sportId: 4,
          settled: false,
          pname: req.user.name,
          createdOn: Date.now(),
        };
        betInfo.push(betObj);
        const posRes = positionCalculator(betInfo, resp);
        let negativeSum = 0;
        for (let i = 0; i < posRes.length; i++) {
          if (posRes[i].position && posRes[i].position < 0) {
            if (negativeSum > posRes[i].position) {
              negativeSum = posRes[i].position;
            }
          }
        }
        if (totalCoins + matchVal < Math.abs(negativeSum)) {
          return res.send({ msg: "Insufficient Balance", status: 0 });
        }
        const tossBetRef = await TossBet.find({
          matchId: matchId,
          userId: username,
        });
        const tData = tossBetRef.map((doc) => doc.toObject());
        var docId;
        let newArr = [];
        if (tData.length > 0) {
          const tossBetMap = new TossBet({
            userId: username,
            stake,
            isBack,
            isLay: !isBack,
            selectionId,
            transactionId: tData[0].transactionId,
            priceValue,
            odds: priceValue,
            selectionName,
            matchname,
            matchId,
            sportId: 4,
            runnerArray,
            settled: false,
            pname: req.user.name,
            time: timestamp,
            createdOn: Date.now(),
          });

          await tossBetMap.save();
          const betData = await TossBet.find({
            matchId: matchId,
            userId: username,
          }).lean();
          resp = positionCalculator(betData, resp);
          let negativeSum = 0;
          for (let i = 0; i < resp.length; i++) {
            if (resp[i].position && resp[i].position < 0) {
              if (negativeSum > resp[i].position) {
                negativeSum = resp[i].position;
              }
            }
          }
          newArr = resp.map(({ nat, position }) => ({
            nat,
            position,
          }));
          for (let i = 0; i < newArr.length; i++) {
            const sid = runnerArray.filter(
              (x) => x.selectionName === newArr[i].nat
            )[0].selectionId;
            newArr[i].sid = sid;
          }
          const changeAmount = Math.abs(negativeSum !== null ? negativeSum : 0);
          const coin = await CoinMap.findOne({
            _id: betData[0].transactionId,
          });
          if (!coin) {
            throw new Error("Coin not found"); // handle error appropriately
          }
          coin.value = parseFloat(changeAmount);
          coin.newArr = newArr;
          coin.lastUpdated = Date.now();
          await coin.save();
        } else {
          docId = new ObjectId();
          const tossBet = new TossBet({
            userId: username,
            stake,
            isBack,
            isLay: !isBack,
            transactionId: docId.toString(),
            priceValue,
            odds: priceValue,
            selectionId: selection[0].selectionId,
            selectionName,
            matchname,
            matchId,
            time: timestamp,
            runnerArray,
            pname: req.user.name,
            sportId,
            settled: false,
            createdOn: Date.now(),
          });
          await tossBet.save();
          const matchBetData = await TossBet.find({
            matchId: matchId,
            userId: username,
          }).lean();
          resp = positionCalculator(matchBetData, resp);

          newArr = resp.map(({ nat, position }) => ({
            nat,
            position,
          }));
          for (let i = 0; i < newArr.length; i++) {
            const sid = runnerArray.filter(
              (x) => x.selectionName === newArr[i].nat
            )[0].selectionId;
            newArr[i].sid = sid;
          }
          const amount = isBack ? stake : (priceValue * stake) / 100;
          const type = 2;
          const msg = `Bet placed of ${stake} coins on ${selectionName}`;
          const coinMap = new CoinMap({
            _id: docId,
            value: parseFloat(amount),
            msg: msg,
            type: type,
            newArr,
            matchId,
            setter: username.toLowerCase(),
            createdOn: Date.now(),
          });
          await coinMap.save();
        }
        const loss = isBack ? stake : Math.round(stake * priceValue) / 100;
        const profit = isBack ? Math.round(stake * priceValue) / 100 : stake;
        const profitList = await CommissionController.disburseMatchCoin(
          username,
          profit * -1
        );
        const lossList = await CommissionController.disburseMatchCoin(
          username,
          loss
        );
        for (var i = 0; i < profitList.length; i++) {
          const { id, commission, percent, commissionPercentage } =
            profitList[i];
          const profitAmount = Math.abs(
            lossList.filter((x) => x.id === id)[0].commission
          );
          if (id !== username) {
            const betUserMap = new BetUserMap({
              name: "tossbet",
              company: id,
              commissionPercentage,
              player: username,
              lossAmount: Math.abs(commission),
              profitAmount,
              selectionId,
              stake: stake,
              isBack: isBack,
              isLay: !isBack,
              priceValue,
              odds: priceValue,
              selectionName: selectionName,
              matchname: matchname,
              matchId,
              sportId,
              settled: false,
              adminShare: percent,
              pname: req.user.name,
              runnerArray,
              createdOn: Date.now(),
            });

            betUserMap.save();
          }
        }
        countAndUpdateCoin(username);
        res.send({ msg: "Bet Placed Successfully!", status: 1 });
      }
    } catch (err) {
      console.error(err);
      res.send({ msg: "System Error", status: 0 });
    }
  },
  async placeBet(req, res) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const username = req.user.username;
      const { stake, isBack, fancyName, matchId } = req.body;
      const sportId = 4;
      var { priceValue, odds } = req.body;
      const priceVal = parseFloat(priceValue).toFixed(2);
      if (stake < 100) {
        return res.send({
          msg: "The amount cannot be less than 100",
          status: 0,
        });
      }
      if (stake > 50000) {
        return res.send({
          msg: "The amount cannot be greater than 50000",
          status: 0,
        });
      }
      const matchDetails = await MatchList.findOne({
        eventId: parseInt(matchId),
      });
      if (!matchDetails) {
        return res.send({
          msg: "Invalid match",
          status: 0,
        });
      }
      const { eventName } = matchDetails;
      const response = await apiSwitch(matchId);
      if (response.status) {
        if (response.data && response.data.Fancymarket.length > 0) {
          const currentData = response.data.Fancymarket.filter(
            (x) => x.nat === fancyName
          );
          const filteredOdds = currentData.filter(
            (x) =>
              (isBack && parseFloat(x.b1) <= parseFloat(odds)) ||
              (!isBack && parseFloat(x.l1) >= parseFloat(odds))
          );

          var docId;
          var sum = 0;
          if (
            filteredOdds.length > 0 &&
            (parseFloat(filteredOdds[0].l1) > 0 ||
              parseFloat(filteredOdds[0].b1) > 0)
          ) {
            if (isBack && parseFloat(filteredOdds[0].b1) <= parseFloat(odds)) {
              odds = filteredOdds[0].b1;
              priceValue = filteredOdds[0].bs1;
            } else if (
              !isBack &&
              parseFloat(filteredOdds[0].l1) >= parseFloat(odds)
            ) {
              odds = filteredOdds[0].l1;
              priceValue = filteredOdds[0].ls1;
            } else {
              return res.send({ msg: "Bhav changed!", status: 0 });
            }
            const liveBets = await BetDataMap.find({
              matchId: matchId,
              fancyName: fancyName,
              userId: username,
            }).exec();
            if (liveBets.length > 0) {
              const newObj = {
                userId: username,
                stake: parseInt(stake),
                isBack,
                isLay: !isBack,
                priceValue: priceVal,
                odds,
                fancyName,
                matchname: eventName,
                matchId,
                sportId,
                settled: false,
                pname: req.user.name,
              };
              liveBets.push(newObj);

              const pairedIds = [];

              for (let i = 0; i < liveBets.length; i++) {
                const bet1 = liveBets[i];
                if (pairedIds.includes(bet1._id)) {
                  continue;
                }
                for (let j = i + 1; j < liveBets.length; j++) {
                  const bet2 = liveBets[j];

                  if (pairedIds.includes(bet2._id)) {
                    continue;
                  }
                  if (bet1.fancyName === bet2.fancyName) {
                    if (
                      (bet1.isBack && !bet2.isBack && bet1.odds <= bet2.odds) ||
                      (!bet1.isBack && bet2.isBack && bet1.odds >= bet2.odds)
                    ) {
                      const amount1 = Math.round(bet1.stake * 100) / 100;
                      const amount2 = Math.round(bet2.stake * 100) / 100;
                      const stakeDiff = Math.abs(amount1 - amount2);
                      const amount3 =
                        Math.round(bet1.stake * bet1.priceValue * 100) / 100;
                      const amount4 =
                        Math.round(bet2.stake * bet2.priceValue * 100) / 100;
                      const lossDiff = Math.abs(amount3 - amount4);
                      const max = Math.max(stakeDiff, lossDiff);
                      sum += max;
                      pairedIds.push(bet1._id, bet2._id);

                      break;
                    }
                  }
                }

                if (!pairedIds.includes(bet1._id)) {
                  const amount =
                    bet1.priceValue > 1
                      ? Math.round(bet1.stake * bet1.priceValue * 100) / 100
                      : bet1.stake;
                  sum += amount;
                }
              }
              const totalCoins = await CoinController.countCoin(
                username.toLowerCase()
              );
              docId = liveBets[0].transactionId;
              coin = await CoinMap.findOne({ _id: docId });
              transactionData = coin.toObject();
              matchVal = coin ? transactionData.value : 0;
              if (totalCoins + matchVal < Math.abs(sum)) {
                return res.send({ msg: "Insufficient Balance", status: 0 });
              }
              const filter = { _id: liveBets[0].transactionId };
              const update = {
                $set: { value: parseFloat(sum), lastUpdated: Date.now() },
              };
              await CoinMap.findOneAndUpdate(filter, update, {
                new: true,
              });
            } else {
              const amount =
                priceVal > 1 ? Math.round(stake * priceVal * 100) / 100 : stake;
              const totalCoins = await CoinController.countCoin(
                username.toLowerCase()
              );
              if (totalCoins < amount) {
                return res.send({ msg: "Insufficient Balance" });
              }
              const coinMap = new CoinMap({
                value: parseFloat(amount),
                msg: `Bet placed of ${stake} coins on ${fancyName}`,
                type: 2,
                selectionName: fancyName,
                matchId: matchId,
                setter: username.toLowerCase(),
                createdOn: Date.now(),
              });
              await coinMap.save();
              docId = coinMap._id.toString();
            }
            const betId = uuidv4();
            const betData = new BetDataMap({
              betId,
              userId: username,
              stake: parseInt(stake),
              transactionId: docId,
              isBack: isBack,
              isLay: !isBack,
              priceValue: priceVal,
              odds: odds,
              fancyName: fancyName,
              matchname: eventName,
              matchId: matchId,
              sportId: sportId,
              settled: false,
              pname: req.user.name,
              createdOn: Date.now(),
            });
            await betData.save();
            const loss =
              priceVal > 1 ? Math.round(stake * priceVal * 100) / 100 : stake;
            const profit =
              priceVal > 1 ? stake : Math.round(stake * priceVal * 100) / 100;
            const profitList = await CommissionController.disburseSessionCoin(
              username,
              profit * -1
            );
            const lossList = await CommissionController.disburseSessionCoin(
              username,
              loss
            );
            for (var i = 0; i < profitList.length; i++) {
              const { id, commission, percent, commissionPercentage } =
                profitList[i];
              const profitAmount = Math.abs(
                lossList.filter((x) => x.id === id)[0].commission
              );
              const myComm = Math.abs(
                priceVal > 1
                  ? profitList.filter((x) => x.id === id)[0].myComm
                  : lossList.filter((x) => x.id === id)[0].myComm
              );
              const commissionAmount = Math.abs(
                priceVal > 1
                  ? profitList.filter((x) => x.id === id)[0].commissionAmount
                  : lossList.filter((x) => x.id === id)[0].commissionAmount
              );
              if (id !== username) {
                const betUserMap = new BetUserMap({
                  name: "sessionbet",
                  company: id,
                  betId,
                  myCom: Math.abs(myComm),
                  sessionCommission: commissionAmount,
                  sessionComPerc: commissionPercentage,
                  player: username,
                  lossAmount: Math.abs(commission),
                  profitAmount,
                  transactionId: docId,
                  stake: stake,
                  isBack: isBack,
                  isLay: !isBack,
                  pname: req.user.name,
                  priceValue: priceVal,
                  odds: odds,
                  fancyName: fancyName,
                  matchname: eventName,
                  matchId,
                  sportId,
                  settled: false,
                  adminShare: percent,
                  createdOn: Date.now(),
                });
                await betUserMap.save();
              }
            }
            countAndUpdateCoin(username.toLowerCase());
            return res.send({ msg: "Bet Placed Successfully!", status: 1 });
          } else {
            return res.send({ msg: "Session Changed.", status: 0 });
          }
        }
        return res.send({ msg: "Unknown Error" });
      } else {
        return res.send({ msg: "Some error in fetching data", status: 0 });
      }
    } catch (error) {
      console.log(error);
      return res.send({ msg: "Session Changed", status: 0 });
    }
  },
  async getUserBets(req, res) {
    const userId = req.user.username;
    const data = await BetUserMap.find({ player: userId }).lean();
    const matchListId = [...new Set(data.map((item) => item.matchId))];
    const matchList = await MatchList.find({
      gameId: { $in: matchListId },
    }).lean();

    const arr = [];
    for (var i = 0; i < data.length; i++) {
      const row = data[i];
      if (arr.filter((x) => x.matchId === row.matchId).length) {
        if (row.settled) {
          if (row.won && row.won === true) {
            arr.filter((x) => x.matchId === row.matchId)[0].sum +=
              row.lossAmount;
          } else {
            arr.filter((x) => x.matchId === row.matchId)[0].sum -=
              row.profitAmount;
          }
        }
      } else {
        const match = matchList.filter((x) => x.gameId === row.matchId)[0];
        if (match) {
          const sum =
            row.settled === true
              ? row.won && row.won === true
                ? row.lossAmount
                : -row.profitAmount
              : 0;
          arr.push({
            matchId: row.matchId,
            matchname: match.eventName,
            marketStartTime: match.marketStartTime,
            sum: sum,
            createdOn: row.createdOn,
          });
        }
      }
    }
    res.send(arr);
  },
  async getPlayerExp(userId) {
    try {
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }

      // Get the user's creation date
      const userCreationDate = user.createdOn;

      const last10Matches = await MatchList.find()
        .sort({ time: 1 })
        .skip(Math.max(0, (await MatchList.countDocuments()) - 20))
        .exec();
      const resultArray = [];
      const prevTotal = await BetController.calculateTotalBalance(userId);
      let totalBalance = prevTotal;

      for (const match of last10Matches) {
        const matchObj = {
          matchId: match.eventId,
          matchName: match.eventName,
          totalProfitLoss: 0,
          balance: 0,
          startTime: match.time,
        };

        const bets = await BetUserMap.find({
          matchId: match.eventId,
          player: userId,
        });

        if (match.createdOn > userCreationDate || bets.length > 0) {
          for (const bet of bets) {
            if (bet.settled) {
              if (bet.won) {
                matchObj.totalProfitLoss += bet.lossAmount;
              } else {
                matchObj.totalProfitLoss -= bet.profitAmount;
              }
            }
          }
          totalBalance += matchObj.totalProfitLoss;
          matchObj.balance = totalBalance;
          resultArray.push(matchObj);
        }
      }
      return resultArray;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async calculateTotalBalance(userId) {
    try {
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return res.send({ totalBalance: 0 }); // Return early with zero balance
      }

      // Get the user's creation date

      // Fetch bets asynchronously and use aggregation for calculating totalBalance
      const last10Matches = await MatchList.find()
        .sort({ time: -1 }) // Sort in descending order of time
        .skip(Math.max(0, 20)) // Skip the last 10 recent matches
        .exec();
      const matchIds = last10Matches.map((match) => match.eventId);

      const bets = await BetUserMap.find({
        matchId: { $in: matchIds },
        player: userId,
        settled: true,
      });

      const totalBalance = bets.reduce((balance, bet) => {
        if (bet.won) {
          return balance + bet.lossAmount;
        } else {
          return balance - bet.profitAmount;
        }
      }, 0);

      return totalBalance;
    } catch (error) {
      console.error("Error fetching data:", error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },
  async getAllCompanyExpo(req, res) {
    const { userId } = req.params;
    const users = await User.find({ companyId: userId });
    for (const user in users) {
      const response = await BetController.companyExpoByMatch(user);
    }
  },
  async getCollectionReport(req, res) {
    try {
      const { matchId } = req.params;
      const userId = req.user.username;

      const users = await User.find({ companyId: userId });

      const dataArr = await Promise.all(
        users.map(async (user) => {
          let balance = 0;
          if (user.level < 6) {
            if (matchId !== "all") {
              balance = await BetController.companyExpoByMatch(
                user.username,
                matchId
              );
            } else {
              balance = await BetController.calculateUserExpo(user.username);
            }
          } else if (user.level === 6) {
            if (matchId === "all") {
              const cash = await countCash(user.username);
              balance = await BetController.getIndivisualPlayerExpo(user);
              balance += cash;
            } else {
              const inf = await BetController.playerExposureByMatch(
                user.username,
                matchId
              );
              balance = inf.balance;
            }
          } else {
            return null;
          }

          return {
            username: user.username,
            name: user.name,
            balance: Math.round(balance * 100) / 100,
          };
        })
      );

      // Filter out null values from the result (for user levels >= 7).
      const filteredData = dataArr.filter((userObj) => userObj !== null);

      res.send(filteredData);
    } catch (err) {
      console.error(err); // Corrected variable name to 'err' from 'error'.
      res.status(500).send({ error: "Internal Server Error" });
    }
  },
  async getIndivisualPlayerExpo(user) {
    try {
      // Find all bets related to the current match and user
      const bets = await BetUserMap.find({
        player: user.username,
        settled: true,
      });
      let totalBalance = 0;
      if (bets.length > 0) {
        // Calculate total profit/loss for the current match and user
        for (const bet of bets) {
          if (bet.settled) {
            if (bet.won) {
              totalBalance -= bet.lossAmount;
            } else {
              totalBalance += bet.profitAmount;
            }
          }
        }
      }

      return Math.round(totalBalance * 100) / 100;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async getIndivisualCompanyExpo(user) {
    try {
      let totalBalance = 0;

      // Calculate total profit/loss for the current match and user
      totalBalance = await BetController.calculateUserExpoWithoutResult(
        user.username
      );
      return Math.round(totalBalance * 100) / 100;
    } catch (err) {
      console.error(err);
    }
  },

  async companyExpoByMatch(userId, matchId) {
    try {
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }
      // Get the user's creation date
      const userCreationDate = user.createdOn;
      const userShare = user.matchShare;
      const companyShare = 100 - userShare;
      var match = await MatchList.findOne({ eventId: matchId }).exec();
      // Iterate through each match
      // Find all bets related to the current match and user

      const bets = await BetController.getMyPlayerAllBets(matchId, userId);
      if (match.createdOn > userCreationDate || bets.length > 0) {
        // Calculate total profit/loss for the current match and user
        const totalBalance = await calculateCompanyExpo(bets, companyShare);
        return Math.round(totalBalance * 100) / 100;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async playerExposureByMatch(userId, matchId) {
    try {
      const user = await User.findOne({ username: userId }).exec();

      if (!user) {
        console.warn(`User with username '${userId}' not found.`);
        return;
      }

      // Get the user's creation date
      const userCreationDate = user.createdOn;

      const match = await MatchList.findOne({ eventId: matchId });
      if (!match) {
        console.warn(`Match with '${matchId}' not found.`);
        return;
      }
      const matchObj = {
        matchId: match.eventId,
        balance: 0,
        username: userId,
        name: user.name,
        startTime: match.time,
      };
      // Find all bets related to the current match and user
      const bets = await BetUserMap.find({
        matchId: match.eventId,
        player: userId,
      });
      let totalBalance = 0;

      if (match.createdOn > userCreationDate || bets.length > 0) {
        // Calculate total profit/loss for the current match and user
        for (const bet of bets) {
          if (bet.settled) {
            if (bet.won) {
              totalBalance -= bet.lossAmount;
            } else {
              totalBalance += bet.profitAmount;
            }
          }
        }
        matchObj.balance = totalBalance;
      }

      return matchObj;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
  async getLedgerList(req, res) {
    const { userId } = req.params;
    const resultArray = await BetController.getPlayerExp(userId);
    res.send(resultArray);
  },
  async getPlayerPnl(userId, startDate, endDate) {
    try {
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
      })
        .sort({ createdOn: -1 })
        .exec();
      const resultArray = [];
      let totalBalance = 0;

      for (const match of last10Matches) {
        const matchObj = {
          matchId: match.eventId,
          matchName: match.eventName,
          totalProfitLoss: 0,
          balance: 0,
          startTime: match.time,
        };

        const bets = await BetUserMap.find({
          matchId: match.eventId,
          player: userId,
        });

        if (match.createdOn > userCreationDate || bets.length > 0) {
          for (const bet of bets) {
            if (bet.settled) {
              if (bet.won) {
                matchObj.totalProfitLoss += bet.lossAmount;
              } else {
                matchObj.totalProfitLoss -= bet.profitAmount;
              }
            }
          }
          matchObj.balance = matchObj.totalProfitLoss;
          matchObj.totalCommission = 0;
          resultArray.push(matchObj);
        }
      }
      return resultArray;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
};

module.exports = BetController;
