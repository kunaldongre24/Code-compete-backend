const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const CoinController = require("./CoinController");
const CommissionController = require("./CommissionController");
const { countAndUpdateCoin, removeNum } = require("./CoinController");
const { getMyAgents, getUserInformation } = require("./AuthController");
const clientCollection = require("../helper/clientCollection");
const countCash = require("../helper/countCash");

const BetController = {
  didWon(isBack, value, odds) {
    var won = false;
    if (isBack) {
      if (value >= odds) {
        won = true;
      } else {
        won = false;
      }
    } else {
      if (value < odds) {
        won = true;
      } else {
        won = false;
      }
    }
    return won;
  },
  async agentReport(req, res) {},
  async resolveBet(fancyName, value) {
    if (
      fancyName === undefined ||
      fancyName.trim() === "" ||
      value === undefined ||
      value.trim() === ""
    ) {
      return;
    }
    var won = false;
    const betRef = db
      .collection("betUserMap")
      .where("fancyName", "==", fancyName)
      .where("settled", "!=", true);
    const response = await betRef.get();
    const data = response.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    const betRef2 = db
      .collection("betDataMap")
      .where("fancyName", "==", fancyName)
      .where("settled", "!=", true);

    for (i = 0; i < data.length; i++) {
      const {
        lossAmount,
        profitAmount,
        id,
        isBack,
        odds,
        player,
        company,
        matchId,
      } = data[i];

      won = BetController.didWon(isBack, value, odds);
      if (won) {
        await CommissionController.coinDistribution(
          won,
          player,
          company,
          lossAmount,
          id,
          matchId
        );
      } else {
        await CommissionController.coinDistribution(
          won,
          player,
          company,
          profitAmount,
          id,
          matchId
        );
      }
      await countAndUpdateCoin(company.toLowerCase());
      await countAndUpdateCoin(player.toLowerCase());
    }
    const resp = await betRef2.get();
    if (resp.empty) {
      console.log("No matching documents.");
      return;
    }
    const settledArr = [];
    resp.forEach(async (doc) => {
      const { odds, isBack, userId, transactionId, matchId } = doc.data();
      if (!settledArr.includes(transactionId)) {
        settledArr.push(transactionId);
        const coinRef = db.collection("coinMap").doc(transactionId);
        const val = await coinRef.get();
        const transactionData = val.data();
        const coinDb = db.collection("coinMap").doc(uuidv4());
        const type = 3;
        await coinDb.set({
          value: parseFloat(transactionData.value),
          msg: "Settlement",
          type,
          matchId,
          getter: userId,
          createdOn: Date.now(),
        });
        await countAndUpdateCoin(userId.toLowerCase());
      }
      const isWon = BetController.didWon(isBack, value, odds);
      await doc.ref.set(
        { settled: true, won: isWon, result: value },
        { merge: true }
      );
    });
    const resultRef = db.collection("betList").doc(uuidv4());
    await resultRef.set({
      fancyName,
      value,
      createdOn: Date.now(),
    });

    return;
  },

  async resolveTossBet(result, matchId) {
    if (result === undefined || matchId === undefined) {
      return;
    }

    var won = false;
    const betRef = db
      .collection("betUserMap")
      .where("settled", "!=", true)
      .where("name", "==", "tossBet");
    const response = await betRef.get();
    const data = response.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    const betRef2 = db.collection("tossBetMap").where("settled", "!=", true);
    for (i = 0; i < data.length; i++) {
      const {
        lossAmount,
        profitAmount,
        id,
        isBack,
        player,
        company,
        selectionName,
        matchId,
      } = data[i];
      if (selectionName) {
        if (isBack) {
          if (selectionName.trim() === result.trim()) {
            won = true;
          } else {
            won = false;
          }
        } else {
          if (selectionName.trim() === result.trim()) {
            won = false;
          } else {
            won = true;
          }
        }
      } else {
        return;
      }
      if (won) {
        await CommissionController.coinDistribution(
          won,
          player,
          company,
          lossAmount,
          id,
          matchId
        );
      } else {
        await CommissionController.coinDistribution(
          won,
          player,
          company,
          profitAmount,
          id,
          matchId
        );
      }

      countAndUpdateCoin(player.toLowerCase());
      countAndUpdateCoin(company.toLowerCase());
    }
    const resp = await betRef2.get();

    if (resp.empty) {
      console.log("No matching documents.");
      return;
    }
    const settledArr = [];
    resp.forEach(async (doc) => {
      const { selectionName, isBack, userId, transactionId, matchId } =
        doc.data();
      if (!settledArr.includes(transactionId)) {
        settledArr.push(transactionId);
        const coinRef = db.collection("coinMap").doc(transactionId);
        const val = await coinRef.get();
        const transactionData = val.data();
        const coinDb = db.collection("coinMap").doc(uuidv4());
        const type = 3;
        await coinDb.set({
          value: parseFloat(transactionData.value),
          msg: "Settlement",
          type,
          matchId,
          getter: userId,
          createdOn: Date.now(),
        });
        userId;
      }
      var isWon = false;
      if (selectionName) {
        if (isBack) {
          if (selectionName.trim() === result.trim()) {
            isWon = true;
          } else {
            isWon = false;
          }
        } else {
          if (selectionName.trim() === result.trim()) {
            isWon = false;
          } else {
            isWon = true;
          }
        }
      } else {
        return;
      }
      doc.ref.set(
        { settled: true, won: isWon, winner: result },
        { merge: true }
      );
    });
    const resultRef = db.collection("tossBetList").doc(uuidv4());
    resultRef.set({
      matchId,
      winner: result,
      createdOn: Date.now(),
    });
    return;
  },
  async resolveMatchBet(sid, winnerSid, matchId) {
    if (sid === undefined || winnerSid === undefined || matchId === undefined) {
      return;
    }
    const resRef = db.collection("matchList").doc(matchId);
    await resRef.set(
      {
        settled: true,
        winnerSid,
      },
      { merge: true }
    );
    var won = false;
    const betRef = db
      .collection("betUserMap")
      .where("marketId", "==", sid)
      .where("settled", "!=", true);
    const response = await betRef.get();
    const data = response.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    const betRef2 = db
      .collection("matchBetMap")
      .where("marketId", "==", sid)
      .where("settled", "!=", true);
    const response3 = await betRef2.get();
    const matchInfo = response3.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    if (matchInfo.length === 0) {
      console.log("No bets found");
      return;
    }
    const coinRef = db.collection("coinMap").doc(matchInfo[0].transactionId);
    const val = await coinRef.get();
    const transactionData = val.data();
    let position = transactionData.newArr.filter((x) => x.sid === winnerSid)[0]
      .position;
    let playerId,
      playerComPercentage = 3;
    let pMatchId;
    const comArr = [];
    for (i = 0; i < data.length; i++) {
      const {
        lossAmount,
        profitAmount,
        id,
        isBack,
        player,
        company,
        selectionId,
        matchId,
        commissionPercentage,
        adminShare,
      } = data[i];
      playerId = player;
      playerComPercentage -= commissionPercentage;
      pMatchId = matchId;
      if (isBack) {
        if (parseInt(winnerSid) === parseInt(selectionId)) {
          won = true;
        } else {
          won = false;
        }
      } else {
        if (parseInt(winnerSid) === parseInt(selectionId)) {
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
          const coinDb = db.collection("coinMap").doc(uuidv4());
          const type = 3;
          await coinDb.set({
            value: Math.abs(comAmount),
            msg: "Commission Distribution",
            matchId,
            type,
            getter: company,
            createdOn: Date.now(),
          });
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
          id,
          matchId
        );
      } else {
        CommissionController.coinDistribution(
          won,
          player,
          company,
          profitAmount,
          id,
          matchId
        );
      }
      countAndUpdateCoin(player.toLowerCase());
      countAndUpdateCoin(company.toLowerCase());
    }

    if (position < 0) {
      const comAmount = (position * playerComPercentage) / 100;
      const elem = { comAmount, player: playerId };
      comArr.push(elem);
      if (comAmount !== 0) {
        const coinDb = db.collection("coinMap").doc(uuidv4());
        const type = 3;
        await coinDb.set({
          value: Math.abs(comAmount),
          msg: "Commission Distribution",
          matchId: pMatchId,
          type,
          getter: playerId,
          createdOn: Date.now(),
        });
        countAndUpdateCoin(playerId);
      }
    } else {
      const elem = { comAmount: 0, player: playerId };
      comArr.push(elem);
    }
    const resp = await betRef2.get();
    if (resp.empty) {
      console.log("No matching documents.");
      return;
    }
    const settledArr = [];
    resp.forEach(async (doc) => {
      const { selectionId, isBack, userId, transactionId, matchId } =
        doc.data();
      if (!settledArr.includes(transactionId)) {
        settledArr.push(transactionId);
        const coinRef = db.collection("coinMap").doc(transactionId);
        const val = await coinRef.get();
        const transactionData = val.data();
        const coinDb = db.collection("coinMap").doc(uuidv4());
        const type = 3;
        await coinDb.set({
          value: parseFloat(transactionData.value),
          msg: "Settlement",
          matchId,
          type,
          getter: userId,
          createdOn: Date.now(),
        });
        countAndUpdateCoin(userId);
      }
      var isWon = false;
      if (isBack) {
        if (parseInt(winnerSid) === parseInt(selectionId)) {
          isWon = true;
        } else {
          isWon = false;
        }
      } else {
        if (parseInt(winnerSid) === parseInt(selectionId)) {
          isWon = false;
        } else {
          isWon = true;
        }
      }
      await doc.ref.set(
        { settled: true, won: isWon, winner: winnerSid },
        { merge: true }
      );
    });
    const agentArr = [];
    let client = {};

    response.forEach(async (doc) => {
      const { selectionId, isBack, company, matchId, matchname, player } =
        doc.data();
      if (!agentArr.includes((x) => x.company === player)) {
        client = { company: player, matchId, matchname };
        agentArr.push({ company, matchId, matchname });
      }

      var isWon = false;
      if (isBack) {
        if (parseInt(winnerSid) === parseInt(selectionId)) {
          isWon = true;
        } else {
          isWon = false;
        }
      } else {
        if (parseInt(winnerSid) === parseInt(selectionId)) {
          isWon = false;
        } else {
          isWon = true;
        }
      }
      const comAmount = comArr.filter((x) => x.player === company)[0].comAmount;

      doc.ref.set(
        { settled: true, won: isWon, winner: winnerSid, comAmount },
        { merge: true }
      );
    });
    agentArr.push(client);
    const resultRef = db.collection("matchBetList").doc(uuidv4());
    resultRef.set({
      sid,
      winnerSid,
      createdOn: Date.now(),
    });
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
      const sumRef = db
        .collection("matchUserMap")
        .where("company", "==", company);
      const querySnapshot = await sumRef.get();
      querySnapshot.forEach((doc) => {
        const sum = doc.data().sum;
        totalSum += parseFloat(sum);
      });
      const resultRef = db.collection("matchUserMap").doc(uuidv4());
      resultRef.set({
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
    }
    return;
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
  async settleTossBet(req, res) {
    const { matchId, result } = req.body;
    BetController.resolveTossBet(result, matchId);
    res.send({ msg: "Bet Settled" });
  },
  async getBetsByMatchId(req, res) {
    const { matchId } = req.params;
    const userRef = db.collection("betDataMap").where("matchId", "==", matchId);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      const unique = [...new Set(data.map((item) => item.fancyName))];
      res.send(unique);
    });
  },
  async getCompanyLenDen(req, res) {
    const userId = req.user.email.split("@")[0];
    const data = await BetController.getLedgerByUserId(userId);
    res.send(data);
  },
  async getReportByUserId(req, res) {
    const { userId } = req.params;
    const data = await BetController.getLedgerByUserId(userId);
    res.send(data);
  },
  async getLedgerByUserId(userId) {
    const userRef = db
      .collection("matchUserMap")
      .where("company", "==", userId);
    const querySnapshot = await userRef.get();
    const data = querySnapshot.docs.map((doc) => doc.data());
    return data;
  },
  async getMatchAllBets(req, res) {
    const { matchId } = req.params;
    const userId = req.user.email.split("@")[0];
    const userRef = db
      .collection("betUserMap")
      .where("matchId", "==", matchId)
      .where("company", "==", userId)
      .where("name", "==", "matchbet");
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      res.send(data);
    });
  },
  async getMatchBetPosition(req, res) {
    const userId = req.user.email.split("@")[0];
    const { matchId } = req.params;
    const betRef = db
      .collection("matchBetMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", userId);
    betRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      res.send(data);
    });
  },
  async getTossBetPosition(req, res) {
    const userId = req.user.email.split("@")[0];
    const { matchId } = req.params;
    const betRef = db
      .collection("tossBetMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", userId);
    betRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      res.send(data);
    });
  },
  async getSessionBetPosition(req, res) {
    const userId = req.user.email.split("@")[0];
    const { matchId } = req.params;
    const betRef = db
      .collection("betUserMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", userId);
    betRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      res.send(data);
    });
  },
  async getBetUsingUserId(req, res) {
    const { matchId } = req.params;
    const userId = req.user.email.split("@")[0];
    const data = await BetController.getMyPlayerBets(matchId, userId);
    res.send(data);
  },
  async getMyPlayerBets(matchId, userId) {
    const userRef = db
      .collection("betUserMap")
      .where("matchId", "==", matchId)
      .where("company", "==", userId)
      .where("name", "==", "sessionbet");
    try {
      const value = await userRef.get();
      const data = value.docs.map((doc) => doc.data());
      return data;
    } catch (error) {
      return;
    }
  },
  async getAllMyClientBets(matchId, userId) {
    var userRef;
    if (matchId === "all") {
      userRef = db
        .collection("betUserMap")
        .where("player", "==", userId)
        .where("settled", "==", true);
    } else {
      userRef = db
        .collection("betUserMap")
        .where("matchId", "==", matchId)
        .where("player", "==", userId)
        .where("settled", "==", true);
    }
    try {
      const value = await userRef.get();
      const data = value.docs.map((doc) => doc.data());
      return data;
    } catch (error) {
      return;
    }
  },
  async getAllMatchBets(userId) {
    const userRef = db
      .collection("betUserMap")
      .where("company", "==", userId)
      .where("settled", "==", true);
    try {
      const value = await userRef.get();
      const data = value.docs.map((doc) => doc.data());
      return data;
    } catch (error) {
      return;
    }
  },
  async getMyPlayerAllBets(matchId, userId) {
    var userRef;
    if (matchId === "all") {
      userRef = db
        .collection("betUserMap")
        .where("company", "==", userId)
        .where("settled", "==", true);
    } else {
      userRef = db
        .collection("betUserMap")
        .where("matchId", "==", matchId)
        .where("company", "==", userId)
        .where("settled", "==", true);
    }
    try {
      const value = await userRef.get();
      const data = value.docs.map((doc) => doc.data());
      return data;
    } catch (error) {
      return;
    }
  },

  async getDetailedMatchBets(req, res) {
    const { matchId } = req.params;
    const userRef = db.collection("betDataMap").where("matchId", "==", matchId);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      res.send(data);
    });
  },
  async getAllBets(req, res) {
    const userRef = db.collection("betDataMap").where("settled", "!=", true);
    var arr = [];
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      for (var i = 0; i < data.length; i++) {
        if (!arr.some((e) => e.fancyName === data[i].fancyName)) {
          arr.push({ fancyName: data[i].fancyName, matchId: data[i].matchId });
        }
      }
      res.send(arr);
    });
  },
  async getAllTossBets(req, res) {
    const level = removeNum(req.user.email.split("@")[0]);
    if (level === "cc") {
      const userRef = db.collection("tossBetMap").where("settled", "!=", true);
      var arr = [];
      userRef.get().then((value) => {
        const data = value.docs.map((doc) => doc.data());
        for (var i = 0; i < data.length; i++) {
          if (
            !arr.some((e) => e.matchId === data[i].matchId)
            // data[i].time - 5.5 * 60 * 60 * 1000 < Date.now()
          ) {
            arr.push({
              runnerArray: data[i].runnerArray,
              matchId: data[i].matchId,
            });
          }
        }
        res.send(arr);
      });
    }
  },
  async getAllMatchTossBets(req, res) {
    const { matchId } = req.params;
    const userId = req.user.email.split("@")[0];
    const userRef = db
      .collection("betUserMap")
      .where("matchId", "==", matchId)
      .where("company", "==", userId)
      .where("name", "==", "tossBet");
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      res.send(data);
    });
  },
  async myAgentBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
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
    const username = req.user.email.split("@")[0];
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
    const username = req.user.email.split("@")[0];
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
    const username = req.user.email.split("@")[0];
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
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
    const arr = await getMyAgents(username);
    const dataArr = [];
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];
      let inf;
      if (removeNum(arrData.username) === "sp") {
        inf = await BetController.getPlayerExposure(matchId, arrData.username);
      } else {
        inf = await BetController.getAgentExposure(matchId, arrData.username);
      }
      const cash = await countCash(arrData.username);

      inf.final = inf.final + cash;
      dataArr.push(inf);
    }
    res.send(dataArr);
  },
  async agentSessionEarning(req, res) {
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
    const arr = await getMyAgents(username);
    const dataArr = [];
    var share;
    for (var i = 0; i < arr.length; i++) {
      const arrData = arr[i];
      share = arrData.matchShare;
      var data = [];
      if (removeNum(arrData.username) === "sp") {
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
        if (removeNum(arrData.username) === "sp") {
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
    const username = req.user.email.split("@")[0];
    const userRef = db
      .collection("betUserMap")
      .where("matchId", "==", matchId)
      .where("company", "==", username)
      .where("settled", "==", true);
    try {
      const value = await userRef.get();
      const arr = [];
      const data = value.docs.map((doc) => {
        const row = doc.data();
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
        console.log(arr);
      });
      res.send(arr);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },
  async getCompanyReport(req, res) {
    const { matchId, username } = req.body;
    const out = await clientCollection(matchId, username);
    res.send(out);
  },
  async getLiveBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
    const userRef = db
      .collection("betDataMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", username);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => {
        const document = doc.data();
        document.id = doc.id;
        return document;
      });
      res.send(data);
    });
  },
  async getMatchLedger(req, res) {
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
    const userRef = db
      .collection("matchBetMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", username)
      .where("settled", "==", true);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => {
        const document = doc.data();
        document.id = doc.id;
        return document;
      });
      res.send(data);
    });
  },
  async getTossLedger(req, res) {
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
    const userRef = db
      .collection("tossBetMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", username)
      .where("settled", "==", true);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => {
        const document = doc.data();
        document.id = doc.id;
        return document;
      });
      res.send(data);
    });
  },
  async getTossBets(req, res) {
    const { matchId } = req.params;
    const username = req.user.email.split("@")[0];
    const userRef = db
      .collection("tossBetMap")
      .where("matchId", "==", matchId)
      .where("userId", "==", username);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => {
        const document = doc.data();
        document.id = doc.id;
        return document;
      });
      res.send(data);
    });
  },
  roundOff(data) {
    const nRate = (Math.round((data / 100) * 100) / 100).toFixed(2);
    return nRate;
  },
  async placeMatchBet(req, res) {
    const username = req.user.email.split("@")[0];
    const {
      stake,
      isBack,
      isLay,
      odds,
      selectionName,
      ipDetail,
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
      ipDetail === undefined ||
      matchname === undefined ||
      matchId === undefined ||
      sportId === undefined ||
      type === undefined
    ) {
      console.log(
        `${stake}=${stake === undefined}\n${isBack}=${
          isBack === undefined
        }\n${isLay}=${isLay === undefined}\n${priceValue}=${
          priceValue === undefined
        }\n${odds}=${odds === undefined}\n${selectionName}=${
          selectionName === undefined
        }\n${matchname}=${matchname === undefined}\n${matchId}=${
          matchId === undefined
        }\n${sportId}=${sportId === undefined}\n${type}=${type === undefined}\n
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

    const totalCoins = await CoinController.countCoin(username.toLowerCase());
    const amount = isBack ? (priceValue * stake) / 100 : stake;

    if (totalCoins < amount) {
      return res.send({ msg: "Insufficient Balance" });
    } else {
      const url = `http://139.144.12.137/getbm2?eventId=${matchId}`;
      const response = await axios.get(url);
      const runnerArray = [];
      var selectionId;
      if (response.data) {
        if (response.data.t1 && response.data.t1.length) {
          selectionId = response.data.t1[0].filter(
            (x) => x.nat === selectionName
          )[0].sid;
          const resp = response.data.t1[0];
          for (var i = 0; i < resp.length; i++) {
            const object = {
              runner: resp[i].nat,
              sid: resp[i].sid,
            };
            runnerArray.push(object);
          }
        }

        if (response.data.t2 && response.data.t2.length) {
          const resp = response.data.t2[0].bm1;
          for (var i = 0; i < runnerArray.length; i++) {
            runnerArray[i].back = resp.filter(
              (x) => x.nat === runnerArray[i].runner
            )[0].l1;
            runnerArray[i].lay = resp.filter(
              (x) => x.nat === runnerArray[i].runner
            )[0].l1;
          }
          const currentData = response.data.t2[0].bm1.filter(
            (x) => x.nat === selectionName
          );
          const filteredOdds = currentData.filter(
            (x) =>
              (isBack && parseFloat(x.b1) === parseFloat(odds)) ||
              (!isBack && parseFloat(x.l1) === parseFloat(odds))
          );
          if (filteredOdds.length && odds > 0) {
            const username = req.user.email.split("@")[0];
            const matchBetRef = db
              .collection("matchBetMap")
              .where("matchId", "==", matchId)
              .where("userId", "==", username);

            const value = await matchBetRef.get();
            const betData = value.docs.map((doc) => doc.data());
            var docId;
            let newArr = [];
            if (betData.length > 0) {
              const betDb = db.collection("matchBetMap").doc(uuidv4());
              await betDb.set({
                userId: username,
                stake: stake,
                isBack: isBack,
                selectionId,
                isLay: !isBack,
                marketId: resp[0].mid,
                transactionId: betData[0].transactionId,
                priceValue: priceValue,
                odds: odds,
                selectionName: selectionName,
                ipDetail: ipDetail,
                matchname: matchname,
                matchId,
                sportId,
                runnerArray,
                settled: false,
                pname: req.user.name,
                createdOn: Date.now(),
              });
              const userRef = db
                .collection("matchBetMap")
                .where("matchId", "==", matchId)
                .where("userId", "==", username);

              const value = await userRef.get();
              const matchBetData = value.docs.map((doc) => doc.data());
              for (var i = 0; i < resp.length; i++) {
                const teamOdds = resp[i];

                for (var j = 0; j < matchBetData.length; j++) {
                  const pos = matchBetData[j];
                  const { isBack, stake, odds } = pos;
                  if (teamOdds.nat === pos.selectionName) {
                    if (!resp[i].position) {
                      resp[i].position = 0;
                    }
                    if (isBack) {
                      const val = parseFloat((odds * stake) / 100);
                      resp[i].position += val;
                    } else {
                      const val = parseFloat((odds * stake) / 100);
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
              const coinDb = db
                .collection("coinMap")
                .doc(betData[0].transactionId);
              await coinDb.update({
                value: parseFloat(changeAmount),
                newArr,
                lastUpdated: Date.now(),
              });
            } else {
              docId = uuidv4();
              const betDb = db.collection("matchBetMap").doc(uuidv4());
              await betDb.set({
                userId: username,
                stake: stake,
                isBack: isBack,
                isLay: !isBack,
                transactionId: docId,
                priceValue: priceValue,
                marketId: resp[0].mid,
                odds: odds,
                selectionId,
                runnerArray,
                selectionName: selectionName,
                ipDetail: ipDetail,
                matchname: matchname,
                matchId,
                pname: req.user.name,
                sportId,
                settled: false,
                createdOn: Date.now(),
              });
              const userRef = db
                .collection("matchBetMap")
                .where("matchId", "==", matchId)
                .where("userId", "==", username);

              const value = await userRef.get();
              const matchBetData = value.docs.map((doc) => doc.data());
              for (var i = 0; i < resp.length; i++) {
                const teamOdds = resp[i];
                for (var j = 0; j < matchBetData.length; j++) {
                  const pos = matchBetData[j];
                  const { isBack, stake, odds } = pos;
                  if (teamOdds.nat === pos.selectionName) {
                    if (!resp[i].position) {
                      resp[i].position = 0;
                    }
                    if (isBack) {
                      const val = parseFloat((odds * stake) / 100);
                      resp[i].position += val;
                    } else {
                      const val = parseFloat((odds * stake) / 100);
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
              const coinDb = db.collection("coinMap").doc(docId);
              await coinDb.set({
                value: parseFloat(amount),
                msg: msg,
                type,
                newArr,
                matchId,
                setter: username.toLowerCase(),
                createdOn: Date.now(),
              });
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
                const betUserMap = db.collection("betUserMap").doc(uuidv4());
                await betUserMap.set({
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
                  ipDetail: ipDetail,
                  matchname: matchname,
                  matchId,
                  sportId,
                  settled: false,
                  adminShare: percent,
                  pname: req.user.name,
                  runnerArray,
                  createdOn: Date.now(),
                });
              }
            }
            countAndUpdateCoin(username);
            res.send({ msg: "Bet Placed Successfully!", status: 1 });
          } else {
            res.send({ msg: "Bhav Changed.", status: 0 });
          }
        }
      }
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
    const username = req.user.email.split("@")[0];
    const {
      stake,
      isBack,
      isLay,
      odds,
      selectionName,
      ipDetail,
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
      ipDetail === undefined ||
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
        const username = req.user.email.split("@")[0];
        const matchBetRef = db
          .collection("tossBetMap")
          .where("matchId", "==", matchId)
          .where("userId", "==", username);

        const value = await matchBetRef.get();
        const betData = value.docs.map((doc) => doc.data());
        var docId;

        if (betData.length > 0) {
          const betDb = db.collection("tossBetMap").doc(uuidv4());
          await betDb.set({
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
            ipDetail: ipDetail,
            matchId,
            sportId: 4,
            settled: false,
            pname: req.user.name,
            createdOn: Date.now(),
          });
          const userRef = db
            .collection("tossBetMap")
            .where("matchId", "==", matchId)
            .where("userId", "==", username);
          const value = await userRef.get();
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
          const matchBetData = value.docs.map((doc) => doc.data());
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
          const coinDb = db.collection("coinMap").doc(betData[0].transactionId);
          await coinDb.update({
            value: parseFloat(changeAmount),
            lastUpdated: Date.now(),
          });
        } else {
          const amount = isBack ? stake : (priceValue * stake) / 100;
          const type = 2;
          const msg = `Bet placed of ${stake} coins on ${selectionName}`;
          docId = uuidv4();
          const coinDb = db.collection("coinMap").doc(docId);
          await coinDb.set({
            value: parseFloat(amount),
            msg: msg,
            type,
            matchId,
            setter: username.toLowerCase(),
            createdOn: Date.now(),
          });
          const betDb = db.collection("tossBetMap").doc(uuidv4());
          await betDb.set({
            userId: username,
            stake: stake,
            isBack: isBack,
            isLay: !isBack,
            transactionId: docId,
            priceValue: 0.95,
            odds: 0.95,
            selectionName: selectionName,
            ipDetail: ipDetail,
            matchname: matchname,
            matchId,
            time: timestamp,
            runnerArray,
            pname: req.user.name,
            sportId,
            settled: false,
            createdOn: Date.now(),
          });
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
            const betUserMap = db.collection("betUserMap").doc(uuidv4());
            await betUserMap.set({
              name: "tossBet",
              company: id,
              player: username,
              matchCommission: commissionAmount,
              lossAmount: Math.abs(commission),
              profitAmount,
              stake: stake,
              isBack: isBack,
              isLay: !isBack,
              priceValue: 0.95,
              odds: 0.95,
              selectionName: selectionName,
              ipDetail: ipDetail,
              matchname: matchDetails.eventName.split("/")[0],
              matchId,
              sportId,
              settled: false,
              adminShare: percent,
              pname: req.user.name,
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
    const username = req.user.email.split("@")[0];
    const {
      stake,
      isBack,
      isLay,
      priceValue,
      odds,
      fancyName,
      ipDetail,
      matchname,
      matchId,
      sportId,
    } = req.body;
    if (
      stake === undefined ||
      isBack === undefined ||
      isLay === undefined ||
      priceValue === undefined ||
      odds === undefined ||
      fancyName === undefined ||
      ipDetail === undefined ||
      matchname === undefined ||
      matchId === undefined ||
      sportId === undefined
    ) {
      return res.send({ msg: "Insufficient data recieved!" });
    }
    const priceVal = parseFloat(priceValue).toFixed(2);
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
    if (totalCoins < stake) {
      return res.send({ msg: "Insufficient Balance" });
    } else {
      const url = `http://139.144.12.137/getbm2?eventId=${matchId}`;
      const response = await axios.get(url);
      if (response.data) {
        if (response.data && response.data.t3.length > 0) {
          const currentData = response.data.t3.filter(
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
          var coinDb;
          if (filterValue.length) {
            const betRef = db
              .collection("betDataMap")
              .where("matchId", "==", matchId)
              .where("fancyName", "==", fancyName)
              .where("userId", "==", username);

            const response = await betRef.get();
            const liveBets = response.docs.map((doc) => {
              const document = doc.data();
              document.id = doc.id;
              return document;
            });

            if (liveBets.length > 0) {
              const newObj = {
                userId: username,
                stake: parseInt(stake),
                isBack: isBack,
                isLay: !isBack,
                priceValue: priceVal,
                odds: odds,
                fancyName: fancyName,
                ipDetail: ipDetail,
                matchname: matchname,
                matchId,
                sportId,
                settled: false,
                pname: req.user.name,
              };
              liveBets.push(newObj);

              const pairedIds = [];

              for (let i = 0; i < liveBets.length; i++) {
                const bet1 = liveBets[i];

                if (pairedIds.includes(bet1.id)) {
                  continue;
                }

                for (let j = i + 1; j < liveBets.length; j++) {
                  const bet2 = liveBets[j];

                  if (pairedIds.includes(bet2.id)) {
                    continue;
                  }
                  if (bet1.fancyName === bet2.fancyName) {
                    if (
                      (bet1.isBack && !bet2.isBack && bet1.odds <= bet2.odds) ||
                      (!bet1.isBack && bet2.isBack && bet1.odds >= bet2.odds)
                    ) {
                      const amount1 =
                        Math.round(bet1.stake * bet1.priceValue * 100) / 100;
                      const amount2 =
                        Math.round(bet2.stake * bet2.priceValue * 100) / 100;
                      const stakeDiff = Math.abs(amount1 - amount2);
                      sum += stakeDiff;

                      pairedIds.push(bet1.id, bet2.id);

                      break;
                    }
                  }
                }

                if (!pairedIds.includes(bet1.id)) {
                  const amount =
                    bet1.priceValue > 1
                      ? Math.round(bet1.stake * bet1.priceValue * 100) / 100
                      : bet1.stake;
                  sum += amount;
                }
              }
              docId = liveBets[0].transactionId;
              coinDb = db.collection("coinMap").doc(liveBets[0].transactionId);
              await coinDb.update({
                value: parseFloat(sum),
                lastUpdated: Date.now(),
              });
            } else {
              const amount =
                priceVal > 1 ? Math.round(stake * priceVal * 100) / 100 : stake;
              docId = uuidv4();
              coinDb = db.collection("coinMap").doc(docId);
              const msg = `Bet placed of ${stake} coins on ${fancyName}`;
              const type = 2;
              await coinDb.set({
                value: parseFloat(amount),
                msg: msg,
                type,
                matchId,
                setter: username.toLowerCase(),
                createdOn: Date.now(),
              });
            }
            const betId = uuidv4();
            const betDb = db.collection("betDataMap").doc(betId);
            await betDb.set({
              userId: username,
              stake: parseInt(stake),
              transactionId: docId,
              isBack: isBack,
              isLay: !isBack,
              priceValue: priceVal,
              odds: odds,
              fancyName: fancyName,
              ipDetail: ipDetail,
              matchname: matchname,
              matchId,
              sportId,
              settled: false,
              pname: req.user.name,
              createdOn: Date.now(),
            });
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
                const betUserMap = db.collection("betUserMap").doc(uuidv4());
                await betUserMap.set({
                  name: "sessionbet",
                  company: id,
                  betId,
                  myCom: Math.abs(myComm),
                  sessionCommission: commissionAmount,
                  sessionComPerc: commissionPercentage,
                  player: username,
                  lossAmount: Math.abs(commission),
                  profitAmount,
                  transactionId: coinDb.id,
                  stake: stake,
                  isBack: isBack,
                  isLay: !isBack,
                  pname: req.user.name,
                  priceValue: priceVal,
                  odds: odds,
                  fancyName: fancyName,
                  ipDetail: ipDetail,
                  matchname: matchname,
                  matchId,
                  sportId,
                  settled: false,
                  adminShare: percent,
                  createdOn: Date.now(),
                });
              }
            }
            countAndUpdateCoin(username.toLowerCase());
            return res.send({ msg: "Bet Placed Successfully!", status: 1 });
          } else {
            return res.send({ msg: "Session Changed.", status: 0 });
          }
        }
        return res.send({ msg: "Unknown Error" });
      }
    }
  },
  async getUserBets(req, res) {
    const userId = req.user.email.split("@")[0];
    const userRef = db.collection("betUserMap").where("player", "==", userId);
    userRef.get().then(async (value) => {
      const data = value.docs.map((doc) => doc.data());
      const matchListId = [...new Set(data.map((item) => item.matchId))];
      var matchList = [];
      for (var i = 0; i < matchListId.length; i++) {
        const matchRef = db.collection("matchList").doc(matchListId[i]);
        const value = await matchRef.get();
        const data = value.data();
        matchList.push(data);
      }
      const arr = [];
      for (var i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.settled) {
          if (arr.filter((x) => x.matchId === row.matchId).length) {
            if (row.won && row.won === true) {
              arr.filter((x) => x.matchId === row.matchId)[0].sum +=
                row.lossAmount;
            } else {
              arr.filter((x) => x.matchId === row.matchId)[0].sum -=
                row.profitAmount;
            }
          } else {
            const sum =
              row.won && row.won === true
                ? row.lossAmount
                : -1 * row.profitAmount;
            arr.push({
              matchId: row.matchId,
              matchname: matchList.filter((x) => x.gameId === row.matchId)[0]
                .eventName,
              sum: sum,
              createdOn: row.createdOn,
            });
          }
        }
      }
      res.send(arr);
    });
  },
};

module.exports = BetController;
