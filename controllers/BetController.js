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
const MatchUserMap = require("../models/MatchUserMap");
const MatchBetMap = require("../models/MatchBetMap");
const MatchList = require("../models/MatchList");
const MatchBetList = require("../models/MatchBetList");
const { ObjectId } = require("mongodb");
const positionCalculator = require("../helper/positionCalculator");
const { default: mongoose } = require("mongoose");
const getApiData = require("../helper/getApiData");

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
    const betRef = BetUserMap.find({
      fancyName: fancyName,
      settled: false,
    });
    const data = await betRef;
    const betRef2 = BetDataMap.find({
      fancyName: fancyName,
      settled: false,
    });
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
        { settled: true, won: won, result: value },
        { new: true }
      );
      await countAndUpdateCoin(company.toLowerCase());
      await countAndUpdateCoin(player.toLowerCase());
    }
    const resp = await betRef2;
    if (!resp.length) {
      console.log("No matching documents.");
      return;
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
        { settled: true, won: isWon, result: value },
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
  // async resolveTossBet(result, matchId) {
  //   if (result === undefined || matchId === undefined) {
  //     return;
  //   }

  //   var won = false;
  //   const betRef = db
  //     .collection("betUserMap")
  //     .where("settled", "!=", true)
  //     .where("name", "==", "tossBet");
  //   const response = await betRef.get();
  //   const data = response.docs.map((doc) => {
  //     const document = doc.data();
  //     document.id = doc.id;
  //     return document;
  //   });
  //   const betRef2 = db.collection("tossBetMap").where("settled", "!=", true);
  //   for (i = 0; i < data.length; i++) {
  //     const {
  //       lossAmount,
  //       profitAmount,
  //       id,
  //       isBack,
  //       player,
  //       company,
  //       selectionName,
  //       matchId,
  //     } = data[i];
  //     if (selectionName) {
  //       if (isBack) {
  //         if (selectionName.trim() === result.trim()) {
  //           won = true;
  //         } else {
  //           won = false;
  //         }
  //       } else {
  //         if (selectionName.trim() === result.trim()) {
  //           won = false;
  //         } else {
  //           won = true;
  //         }
  //       }
  //     } else {
  //       return;
  //     }
  //     if (won) {
  //       await CommissionController.coinDistribution(
  //         won,
  //         player,
  //         company,
  //         lossAmount,
  //         id,
  //         matchId
  //       );
  //     } else {
  //       await CommissionController.coinDistribution(
  //         won,
  //         player,
  //         company,
  //         profitAmount,
  //         id,
  //         matchId
  //       );
  //     }

  //     countAndUpdateCoin(player.toLowerCase());
  //     countAndUpdateCoin(company.toLowerCase());
  //   }
  //   const resp = await betRef2.get();

  //   if (resp.empty) {
  //     console.log("No matching documents.");
  //     return;
  //   }
  //   const settledArr = [];
  //   resp.forEach(async (doc) => {
  //     const { selectionName, isBack, userId, transactionId, matchId } =
  //       doc.data();
  //     if (!settledArr.includes(transactionId)) {
  //       settledArr.push(transactionId);
  //       const coinRef = db.collection("coinMap").doc(transactionId);
  //       const val = await coinRef.get();
  //       const transactionData = val.data();
  //       const coinDb = db.collection("coinMap").doc(uuidv4());
  //       const type = 3;
  //       await coinDb.set({
  //         value: parseFloat(transactionData.value),
  //         msg: "Settlement",
  //         type,
  //         matchId,
  //         getter: userId,
  //         createdOn: Date.now(),
  //       });
  //       userId;
  //     }
  //     var isWon = false;
  //     if (selectionName) {
  //       if (isBack) {
  //         if (selectionName.trim() === result.trim()) {
  //           isWon = true;
  //         } else {
  //           isWon = false;
  //         }
  //       } else {
  //         if (selectionName.trim() === result.trim()) {
  //           isWon = false;
  //         } else {
  //           isWon = true;
  //         }
  //       }
  //     } else {
  //       return;
  //     }
  //     doc.ref.set(
  //       { settled: true, won: isWon, winner: result },
  //       { merge: true }
  //     );
  //   });
  //   const resultRef = db.collection("tossBetList").doc(uuidv4());
  //   resultRef.set({
  //     matchId,
  //     winner: result,
  //     createdOn: Date.now(),
  //   });
  //   return;
  // },
  async resolveMatchBet(sid, winnerSid, matchId) {
    if (!sid || !winnerSid || !matchId) {
      return;
    }
    await MatchList.updateOne(
      { gameId: matchId },
      { $set: { settled: true, winnerSid: winnerSid } }
    );
    var won = false;
    const data = await BetUserMap.find({
      matchId: matchId,
      settled: false,
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
    const agentArr = [];
    let client = {};
    for (const bet of data) {
      const { selectionId, isBack, company, matchId, matchname, player } = bet;
      if (!agentArr.some((agent) => agent.company === company)) {
        client.company = player;
        client.matchId = matchId;
        client.matchname = matchname;
        agentArr.push({ company, matchId, matchname });
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
      const comAmount = comArr.filter((x) => x.player === company)[0].comAmount;
      await BetUserMap.updateOne(
        { _id: bet._id },
        {
          settled: true,
          won: isWon,
          winner: winnerSid,
          comAmount,
        }
      );
    }
    agentArr.push(client);
    const resultDoc = new MatchBetList({
      sid,
      winnerSid,
      createdOn: Date.now(),
    });
    await resultDoc.save();
    for (var i = 0; i < agentArr.length; i++) {
      const { matchId, company, matchname } = agentArr[i];
      let final;
      if (removeNum(company) === "sp") {
        const exposure = await BetController.getPlayerExposure(
          matchId,
          company
        );
        final = exposure.final;
      } else {
        const exposure = await BetController.getAgentExposure(matchId, company);
        final = exposure.final;
      }
      let totalSum = 0;
      const sumRef = await MatchUserMap.find({ company: company });
      sumRef.forEach((doc) => {
        const sum = doc.sum;
        totalSum += parseFloat(sum);
      });
      const result = new MatchUserMap({
        company,
        matchId,
        matchname,
        sum: final,
        type: "match",
        total: totalSum + final,
        sid,
        winnerSid,
        createdOn: Date.now(),
      });
      await result.save();
    }
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
      const { winner, matchId } = req.body;
      await BetController.deleteMatchResult(winner, matchId);
      res.send("Match Result Deleted!");
    } catch (error) {
      console.log(error);
      res.send("Error Encountered");
    }
  },
  async deleteFancyResult(fancyName, matchId) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const queryOptions = { session };
        const queries = [
          BetDataMap.updateMany(
            { matchId, fancyName },
            { $set: { settled: false, won: false } },
            queryOptions
          ),
          BetUserMap.updateMany(
            { matchId, fancyName },
            { $set: { settled: false, won: false } },
            queryOptions
          ),
          CoinMap.deleteMany(
            { matchId, selectionName: fancyName, type: 3 },
            queryOptions
          ),
        ];
        for await (const query of queries) {
          // Do nothing
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      session.endSession();
    }
  },
  async deleteMatchResult(winner, matchId) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const queryOptions = { session };
        const queries = [
          MatchBetMap.updateMany(
            { matchId },
            { $set: { settled: false, won: false } },
            queryOptions
          ),
          BetUserMap.updateMany(
            { matchId, winner },
            { $set: { settled: false } },
            queryOptions
          ),
          CoinMap.deleteMany({ selectionName: matchId, type: 3 }, queryOptions),
        ];
        for await (const query of queries) {
          // Do nothing
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      session.endSession();
    }
  },
  async deleteMatchBet(req, res) {
    const { marketId, pwd } = req.params;
    if (!marketId || pwd !== "567Eight@") {
      return res.send("<3");
    }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const queryOptions = { session };
        const queries = [
          MatchBetMap.deleteMany({ marketId }, queryOptions),
          BetUserMap.deleteMany({ marketId, name: "matchbet" }, queryOptions),
          CoinMap.deleteMany({ "newArr.0.mid": marketId }, queryOptions),
        ];
        for await (const query of queries) {
          // Do nothing
        }
      });
      res.send("Bet Deleted");
    } catch (err) {
      console.error(err);
    } finally {
      session.endSession();
    }
  },
  async settleBet(req, res) {
    const { fancyName, value } = req.body;
    BetController.resolveBet(fancyName, value);
    res.send({ msg: "Bet Settled" });
  },
  async settleMatchBet(req, res) {
    const { sid, winnerSid, matchId } = req.body;
    BetController.resolveMatchBet(sid, winnerSid, matchId);
    res.send({ msg: "Bet Settled" });
  },
  // async settleTossBet(req, res) {
  //   const { matchId, result } = req.body;
  //   BetController.resolveTossBet(result, matchId);
  //   res.send({ msg: "Bet Settled" });
  // },
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
      const currentTime = new Date().toISOString(); // Convert current time to ISO string format
      const unsettledMatches = await MatchList.find({
        settled: false,
        marketStartTime: { $lt: currentTime },
      }).exec();
      socket.emit("unsettledMatches", unsettledMatches);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Internal server error");
    }
  },
  async getCompanyLenDen(req, res) {
    const userId = req.user.username;
    const data = await BetController.getLedgerByUserId(userId);
    res.send(data);
  },
  async getReportByUserId(req, res) {
    const { userId } = req.params;
    const data = await BetController.getLedgerByUserId(userId);
    res.send(data);
  },
  async getLedgerByUserId(userId) {
    const data = await MatchUserMap.find({ company: userId }).lean();
    return data;
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
  // async getTossBetPosition(req, res) {
  //   const userId = req.user.username;
  //   const { matchId } = req.params;
  //   const betData = await TossBet.find({ matchId: matchId, userId: userId });
  //   res.send(betData);
  // },
  // async getSessionBetPosition(req, res) {
  //   try {
  //     const userId = req.user.username;
  //     const { matchId } = req.params;
  //     const bets = await BetUserMap.find({ userId, matchId });
  //     res.send(bets);
  //   } catch (error) {
  //     console.error(error);
  //     res.send("Server error");
  //   }
  // },
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
    const data = await BetUserMap.find(query);
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
      name: "tossBet",
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
        } else if (val.name === "matchbet") {
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
      } else if (val.name === "matchbet") {
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
      } else if (val.name === "matchbet") {
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
        } else if (val.name === "matchbet") {
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
        } else if (val.name === "matchbet") {
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
  async myAgentCollection(req, res) {
    try {
      const { matchId } = req.params;
      const username = req.user.username;
      const arr = await getMyAgents(username);
      const dataArr = [];
      for (var i = 0; i < arr.length; i++) {
        const arrData = arr[i];
        let inf;
        if (arrData.level === 6) {
          inf = await BetController.getPlayerExposure(
            matchId,
            arrData.username
          );
        } else {
          inf = await BetController.getAgentExposure(matchId, arrData.username);
        }
        const cash = await countCash(arrData.username);

        inf.final = inf.final + cash;
        dataArr.push(inf);
      }
      res.send(dataArr);
    } catch (err) {
      console.error(err);
      res.send("Internal Server Error");
    }
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
      dataArr.push(inf);
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
        } else if (row.name === "matchbet") {
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
    res.send(data);
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
  // async getTossBets(req, res) {
  //   const { matchId } = req.params;
  //   const username = req.user.username;
  //   const data = await TossBetMap.find({ matchId, userId: username });
  //   res.send(data);
  // },
  roundOff(data) {
    const nRate = (Math.round((data / 100) * 100) / 100).toFixed(2);
    return nRate;
  },
  async placeMatchBet(req, res) {
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    const username = req.user.username;
    const {
      stake,
      isBack,
      odds,
      selectionName,
      matchname,
      priceValue,
      matchId,
      sportId,
    } = req.body;
    if (
      stake === undefined ||
      isBack === undefined ||
      priceValue === undefined ||
      odds === undefined ||
      selectionName === undefined ||
      matchname === undefined ||
      matchId === undefined ||
      sportId === undefined
    ) {
      console.log(
        `${stake}=${stake === undefined}\n${isBack}=${
          isBack === undefined
        }\n${priceValue}=${priceValue === undefined}\n${odds}=${
          odds === undefined
        }\n${selectionName}=${selectionName === undefined}\n${matchname}=${
          matchname === undefined
        }\n${matchId}=${matchId === undefined}\n${sportId}=${
          sportId === undefined
        }\n
       `
      );
      return res.send({ msg: "Insufficient data recieved!" });
    }
    if (stake < 100) {
      return res.send({ msg: "The amount cannot be less than 100", status: 0 });
    }
    if (stake > 50000) {
      return res.send({
        msg: "The amount cannot be greater than 50000",
        status: 0,
      });
    }
    const response = await getApiData(matchId);
    const runnerArray = [];
    var selectionId;
    if (response.status) {
      if (response.data.BMmarket && response.data.BMmarket.bm1) {
        selectionId = response.data.BMmarket.bm1.filter(
          (x) => x.nat === selectionName
        )[0].sid;
        const resp = response.data.BMmarket.bm1;
        for (var i = 0; i < resp.length; i++) {
          const object = {
            runner: resp[i].nat,
            sid: resp[i].sid,
          };
          runnerArray.push(object);
        }
      }
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
          selectionId: selectionId,
          isLay: !isBack,
          marketId: resp[0].mid,
          priceValue: priceValue,
          odds: odds,
          selectionName: selectionName,
          matchname: matchname,
          matchId: matchId,
          sportId: sportId,
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
          )[0].l1;
          runnerArray[i].lay = resp.filter(
            (x) => x.nat === runnerArray[i].runner
          )[0].l1;
        }
        const currentData = response.data.BMmarket.bm1.filter(
          (x) => x.nat === selectionName
        );
        const filteredOdds = currentData.filter(
          (x) =>
            (isBack && parseFloat(x.b1) === parseFloat(odds)) ||
            (!isBack && parseFloat(x.l1) === parseFloat(odds))
        );
        if (filteredOdds.length && odds > 0) {
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
              stake: stake,
              isBack: isBack,
              selectionId: selectionId,
              isLay: !isBack,
              marketId: resp[0].mid,
              transactionId: betData[0].transactionId,
              priceValue: priceValue,
              odds: odds,
              selectionName: selectionName,
              matchname: matchname,
              matchId: matchId,
              sportId: sportId,
              runnerArray: runnerArray,
              settled: false,
              pname: req.user.name,
              createdOn: Date.now(),
            };
            const matchBetMap = new MatchBetMap(bData);
            await matchBetMap.save();
            const userRef = await MatchBetMap.find({
              matchId: matchId,
              userId: username,
            });
            const matchBetData = userRef.map((doc) => doc.toObject());
            resp = positionCalculator(matchBetData, resp);
            let negativeSum = 0;
            for (let i = 0; i < resp.length; i++) {
              if (resp[i].position && resp[i].position < 0) {
                if (negativeSum > resp[i].position) {
                  negativeSum = resp[i].position;
                }
              }
            }
            newArr = resp.map(({ mid, nat, position }) => ({
              mid,
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
              stake: stake,
              isBack: isBack,
              isLay: !isBack,
              transactionId: docId.toString(),
              priceValue: priceValue,
              marketId: resp[0].mid,
              odds: odds,
              selectionId: selectionId,
              runnerArray: runnerArray,
              selectionName: selectionName,
              matchname: matchname,
              matchId: matchId,
              pname: req.user.name,
              sportId: sportId,
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

            newArr = resp.map(({ mid, nat, position }) => ({
              mid,
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
                marketId: resp[0].mid,
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
    return;
    const username = req.user.username;
    const {
      stake,
      isBack,
      isLay,
      odds,
      selectionName,
      matchname,
      priceValue,
      matchId,
      sportId,
      type,
    } = req.body;
    if (
      stake === undefined ||
      isBack === undefined ||
      isLay === undefined ||
      priceValue === undefined ||
      odds === undefined ||
      selectionName === undefined ||
      matchname === undefined ||
      matchId === undefined ||
      sportId === undefined ||
      type === undefined
    ) {
      return res.send({ msg: "Insufficient data recieved!" });
    }
    if (stake < 100) {
      return res.send({ msg: "The amount cannot be less than 100", status: 0 });
    }
    if (stake > 50000) {
      return res.send({
        msg: "The amount cannot be greater than 50000",
        status: 0,
      });
    }
    const totalCoins = await CoinController.countCoin(username.toLowerCase());
    const amount = isBack ? (priceValue * stake) / 100 : stake;
    if (totalCoins < amount) {
      return res.send({ msg: "Insufficient Balance" });
    } else {
      const url = "http://marketsarket.in:3000/getcricketmatches";
      const response = await axios.get(url);
      const matchDetails = response.data.filter((x) => x.gameId === matchId)[0];
      const teams = matchDetails.eventName.split("/")[0].split("v");
      const timestamp = BetController.convertTimeStamp(matchDetails.eventName);
      const runnerArray = [];
      for (var i = 0; i < teams.length; i++) {
        runnerArray.push(teams[i].trim());
      }
      if (
        matchDetails &&
        matchDetails.eventName &&
        BetController.convertTimeStamp(matchDetails.eventName) > Date.now()
      ) {
        const username = req.user.username;
        const betData = await TossBet.find({
          matchId: matchId,
          userId: username,
        }).lean();
        var docId;
        if (betData.length > 0) {
          const tossBetMap = new TossBetMap({
            userId: username,
            stake: stake,
            isBack: isBack,
            isLay: !isBack,
            transactionId: betData[0].transactionId,
            priceValue: 0.95,
            time: timestamp,
            runnerArray,
            odds: 0.95,
            selectionName: selectionName,
            matchId,
            sportId: 4,
            settled: false,
            pname: req.user.name,
            createdOn: Date.now(),
          });

          await tossBetMap.save();

          const matchBetData = await TossBet.find({
            matchId: matchId,
            userId: username,
          }).lean();
          const resp = [];
          if (matchDetails && matchDetails.eventName) {
            if (
              BetController.convertTimeStamp(matchDetails.eventName) >
              Date.now()
            ) {
              const team = matchDetails.eventName.split("/")[0].split(" v ");
              for (var i = 0; i < team.length; i++) {
                const data = { selectionName: team[i], back: 95, lay: 0 };
                resp.push(data);
              }
            }
          }
          for (var i = 0; i < resp.length; i++) {
            const teamOdds = resp[i];
            for (var j = 0; j < matchBetData.length; j++) {
              const pos = matchBetData[j];
              const { isBack, stake, odds } = pos;
              if (teamOdds.selectionName === pos.selectionName) {
                if (!resp[i].position) {
                  resp[i].position = 0;
                }
                if (isBack) {
                  const val = parseFloat(odds * stake);
                  resp[i].position += val;
                } else {
                  const val = parseFloat(odds * stake);
                  resp[i].position -= val;
                }
              } else {
                if (!resp[i].position) {
                  resp[i].position = 0;
                }
                if (isBack) {
                  const val = parseFloat(stake);
                  resp[i].position -= val;
                } else {
                  const val = parseFloat(stake);
                  resp[i].position += val;
                }
              }
            }
          }
          let negativeSum = 0;
          for (let i = 0; i < resp.length; i++) {
            if (resp[i].position && resp[i].position < 0) {
              if (negativeSum > resp[i].position) {
                negativeSum = resp[i].position;
              }
            }
          }
          const changeAmount = Math.abs(negativeSum !== null ? negativeSum : 0);
          const filter = { transactionId: betData[0].transactionId };
          const update = {
            value: parseFloat(changeAmount),
            lastUpdated: Date.now(),
          };
          const options = { new: true }; // to return the updated document
          const updatedCoin = await CoinMap.findOneAndUpdate(
            filter,
            update,
            options
          );
        } else {
          const amount = isBack ? stake : (priceValue * stake) / 100;
          const type = 2;
          const msg = `Bet placed of ${stake} coins on ${selectionName}`;
          docId = uuidv4();
          // Insert document into coinMap collection
          const coin = new CoinMap({
            _id: docId,
            value: parseFloat(amount),
            msg: msg,
            type: type,
            matchId: matchId,
            setter: username.toLowerCase(),
            createdOn: Date.now(),
          });

          await coin.save();

          // Insert document into tossBetMap collection
          const tossBet = new TossBet({
            userId: username,
            stake: stake,
            isBack: isBack,
            isLay: !isBack,
            transactionId: docId,
            priceValue: 0.95,
            odds: 0.95,
            selectionName: selectionName,
            matchname: matchname,
            matchId: matchId,
            time: timestamp,
            runnerArray: runnerArray,
            pname: req.user.name,
            sportId: sportId,
            settled: false,
            createdOn: Date.now(),
          });

          await tossBet.save();
        }
        countAndUpdateCoin(username.toLowerCase());
        const loss = isBack ? stake : Math.round(stake * odds * 100) / 100;
        const profit = isBack ? Math.round(stake * odds * 100) / 100 : stake;
        const profitList = await CommissionController.disburseMatchCoin(
          username,
          profit * -1
        );
        const lossList = await CommissionController.disburseMatchCoin(
          username,
          loss
        );
        for (var i = 0; i < profitList.length; i++) {
          const { id, commission, percent, commissionAmount } = profitList[i];
          const profitAmount = Math.abs(
            lossList.filter((x) => x.id === id)[0].commission
          );
          if (id !== username) {
            const betUserMap = new BetUserMap({
              adminShare: percent,
              profitAmount: commissionAmount,
              company: id,
              lossAmount: Math.abs(commission),
              isBack: isBack,
              isLay: !isBack,
              matchId: matchId,
              matchName: matchDetails.eventName.split("/")[0],
              odds: 0.95,
              pname: req.user.name,
              priceValue: 0.95,
              selectionName: selectionName,
              settled: false,
              sportId: sportId,
              stake: stake,
              player: username,
              won: false,
              createdOn: Date.now(),
            });
          }
        }
        res.send({ msg: "Bet Placed Successfully!", status: 1 });
      } else {
        res.send({ msg: "Session Changed.", status: 0 });
      }
    }
  },
  async placeBet(req, res) {
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const username = req.user.username;
      const { stake, isBack, priceValue, odds, fancyName, matchId, sportId } =
        req.body;

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
      const { matchname } = matchDetails;
      const response = await getApiData(matchId);
      if (response.status) {
        if (response.data && response.data.Fancymarket.length > 0) {
          const currentData = response.data.Fancymarket.filter(
            (x) => x.nat === fancyName
          );
          const filteredOdds = currentData.filter(
            (x) =>
              (isBack && parseFloat(x.b1) === parseFloat(odds)) ||
              (!isBack && parseFloat(x.l1) === parseFloat(odds))
          );
          const filterValue = filteredOdds.filter(
            (x) =>
              (isBack && priceVal === BetController.roundOff(x.bs1)) ||
              (!isBack && priceVal === BetController.roundOff(x.ls1))
          );
          var docId;
          var sum = 0;
          if (filterValue.length > 0) {
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
                matchname,
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
              matchname: matchname,
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
                lossList.filter((x) => x.id === id)[0].myComm
              );
              const commissionAmount = Math.abs(
                lossList.filter((x) => x.id === id)[0].commissionAmount
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
                  marketId: filterValue[0].mid,
                  isLay: !isBack,
                  pname: req.user.name,
                  priceValue: priceVal,
                  odds: odds,
                  fancyName: fancyName,
                  matchname: matchname,
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
  async getLedgerList(req, res) {},
};

module.exports = BetController;
