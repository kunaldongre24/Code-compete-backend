const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const CoinController = require("./CoinController");
const CommissionController = require("./CommissionController");
const { countAndUpdateCoin, removeNum } = require("./CoinController");
const { getMyAgents, getUserInformation } = require("./AuthController");
const AuthController = require("./AuthController");

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
      const { lossAmount, profitAmount, id, isBack, odds, player, company } =
        data[i];

      won = BetController.didWon(isBack, value, odds);
      if (won) {
        await CommissionController.coinDistribution(
          won,
          player,
          company,
          lossAmount,
          id
        );
      } else {
        await CommissionController.coinDistribution(
          won,
          player,
          company,
          profitAmount,
          id
        );
      }

      await countAndUpdateCoin(player.toLowerCase());
      await countAndUpdateCoin(company.toLowerCase());
    }
    const resp = await betRef2.get();

    if (resp.empty) {
      console.log("No matching documents.");
      return;
    }
    const settledArr = [];
    resp.forEach(async (doc) => {
      const { odds, isBack, userId, transactionId } = doc.data();
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
          getter: userId,
          createdOn: Date.now(),
        });
        await countAndUpdateCoin(userId);
      }

      const isWon = BetController.didWon(isBack, value, odds);
      await doc.ref.set({ settled: true, won: isWon }, { merge: true });
    });
    const resultRef = db.collection("betList").doc(uuidv4());
    await resultRef.set({
      fancyName,
      value,
      createdOn: Date.now(),
    });
    return;
  },
  async settleBet(req, res) {
    const { fancyName, value } = req.body;
    BetController.resolveBet(fancyName, value);
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
    return inf;
  },
  async playerCollection(req, res) {
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
        final: Math.round(final * 100) / 100,
      };
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
      data = await BetController.getMyPlayerAllBets(matchId, arrData.username);
      var sessionSum = 0;
      var sCom = 0;
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
              console.log(row.lossAmount);
              arr.filter((x) => x.player === row.player)[0].sessionSum -=
                row.lossAmount;
            } else {
              console.log(row.profitAmount);
              arr.filter((x) => x.player === row.player)[0].sessionSum +=
                row.profitAmount;
            }
          } else {
            var sessionSum = 0;
            const sessionStake = row.stake * rate;
            if (row.won && row.won === true) {
              console.log(row.lossAmount);

              sessionSum -= row.lossAmount;
            } else {
              console.log(row.profitAmount);
              sessionSum += row.profitAmount;
            }
            const inf = {
              player: row.player,
              sessionSum,
              sessionStake,
              adminShare: row.adminShare,
              pname: row.pname ? row.pname : "",
            };
            arr.push(inf);
          }
        } else if (row.name === "matchbet") {
          if (arr.some((x) => x.player === row.player)) {
            arr.filter((x) => x.player === row.player)[0].matchStake +=
              row.stake * rate;
            if (row.won && row.won === true) {
              arr.filter((x) => x.player === row.player)[0].matchSum -=
                row.lossAmount;
            } else {
              arr.filter((x) => x.player === row.player)[0].matchSum +=
                row.profitAmount;
            }
          } else {
            var matchSum = 0;
            const matchStake = row.stake * rate;
            if (row.won) {
              matchSum -= row.lossAmount;
            } else {
              matchSum += row.profitAmount;
            }
            const inf = {
              player: row.player,
              matchSum,
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
      res.status(500).send("Internal Server Error");
    }
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
        stake,
        isBack,
        isLay,
        priceValue,
        odds,
        selectionName,
        matchname,
        matchId,
        sportId,
        type
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

    const priceVal = parseFloat(priceValue).toFixed(2);
    const totalCoins = await CoinController.countCoin(username.toLowerCase());
    const amount = isBack ? priceValue : stake;

    if (totalCoins < amount) {
      return res.send({ msg: "Insufficient Balance" });
    } else {
      const url = `http://139.144.12.137/getbm2?eventId=${matchId}`;
      const response = await axios.get(url);
      if (response.data) {
        if (
          response.data.data &&
          response.data.data.filter((x) => x.gtype === "fancy")
        ) {
          const resp = response.data.data.filter((x) => x.gtype === "fancy")[0]
            .section;
          const runnerArray = [];
          for (var i = 0; i < resp.length; i++) {
            const object = {
              runner: resp[i].nat,
              back: resp[i].odds.filter((x) => x.oname === "back1")[0].odds,
              lay: resp[i].odds.filter((x) => x.oname === "lay1")[0].odds,
            };
            runnerArray.push(object);
          }
          const currentData = response.data.data
            .filter((x) => x.gtype === "match1")[0]
            .section.filter((x) => x.nat === selectionName);
          const filteredOdds = currentData.filter(
            (x) =>
              (isBack &&
                parseFloat(
                  x.odds.filter((x) => x.oname === "back1")[0].odds
                ) === parseFloat(odds)) ||
              (!isBack &&
                parseFloat(x.odds.filter((x) => x.oname === "lay1")[0].odds) ===
                  parseFloat(odds))
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
            if (betData.length > 0) {
              const betDb = db.collection("matchBetMap").doc(uuidv4());
              await betDb.set({
                userId: username,
                stake: stake,
                isBack: isBack,
                isLay: !isBack,
                transactionId: betData[0].transactionId,
                priceValue: priceValue,
                odds: odds,
                selectionName: selectionName,
                ipDetail: ipDetail,
                matchname: matchname,
                matchId,
                sportId,
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
              let resp = response.data.data.filter(
                (x) => x.gtype === "match1"
              )[0].section;
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
                      resp[i].position += parseFloat((odds * stake) / 100);
                    } else {
                      resp[i].position -= parseFloat((odds * stake) / 100);
                    }
                  } else {
                    if (!resp[i].position) {
                      resp[i].position = 0;
                    }
                    if (isBack) {
                      resp[i].position -= parseFloat(stake);
                    } else {
                      resp[i].position += parseFloat(stake);
                    }
                  }
                }
              }
              let negativeSum = 0;
              for (let i = 0; i < resp.length; i++) {
                if (resp[i].position && resp[i].position < 0) {
                  negativeSum += resp[i].position;
                }
              }
              const changeAmount = Math.abs(
                negativeSum !== null ? negativeSum : 0
              );
              const coinDb = db
                .collection("coinMap")
                .doc(betData[0].transactionId);
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
                setter: username.toLowerCase(),
                createdOn: Date.now(),
              });
              await countAndUpdateCoin(username.toLowerCase());
              const betDb = db.collection("matchBetMap").doc(uuidv4());
              await betDb.set({
                userId: username,
                stake: stake,
                isBack: isBack,
                isLay: !isBack,
                transactionId: docId,
                priceValue: priceValue,
                odds: odds,
                selectionName: selectionName,
                ipDetail: ipDetail,
                matchname: matchname,
                matchId,
                pname: req.user.name,
                sportId,
                settled: false,
                createdOn: Date.now(),
              });
            }

            const loss =
              priceVal > 1 ? Math.round(stake * priceVal * 100) / 100 : stake;

            const profit =
              priceVal > 1 ? stake : Math.round(stake * priceVal * 100) / 100;
            const profitList = await CommissionController.disburseMatchCoin(
              username,
              profit * -1
            );

            const lossList = await CommissionController.disburseMatchCoin(
              username,
              loss
            );
            for (var i = 0; i < profitList.length; i++) {
              const { id, commission, percent, commissionAmount } =
                profitList[i];
              const profitAmount = Math.abs(
                lossList.filter((x) => x.id === id)[0].commission
              );
              if (id !== username) {
                const betUserMap = db.collection("betUserMap").doc(uuidv4());
                await betUserMap.set({
                  name: "matchbet",
                  company: id,
                  player: username,
                  matchCommission: commissionAmount,
                  lossAmount: Math.abs(commission),
                  profitAmount,
                  stake: stake,
                  isBack: isBack,
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
            res.send({ msg: "Bet Placed Successfully!", status: 1 });
          } else {
            res.send({ msg: "Session Changed.", status: 0 });
          }
        }
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
        if (
          response.data.data &&
          response.data.data.filter((x) => x.gtype === "fancy")
        ) {
          const currentData = response.data.data
            .filter((x) => x.gtype === "fancy")[0]
            .section.filter((x) => x.nat === fancyName);
          const filteredOdds = currentData.filter(
            (x) =>
              (isBack &&
                parseFloat(
                  x.odds.filter((x) => x.oname === "back1")[0].odds
                ) === parseFloat(odds)) ||
              (!isBack &&
                parseFloat(x.odds.filter((x) => x.oname === "lay1")[0].odds) ===
                  parseFloat(odds))
          );
          const filterValue = filteredOdds.filter(
            (x) =>
              (isBack &&
                priceVal ===
                  BetController.roundOff(
                    x.odds.filter((y) => y.oname === "back1")[0].size
                  )) ||
              (!isBack &&
                priceVal ===
                  BetController.roundOff(
                    x.odds.filter((y) => y.oname === "lay1")[0].size
                  ))
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
                stake: stake,
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
                setter: username.toLowerCase(),
                createdOn: Date.now(),
              });
            }
            const betId = uuidv4();
            await countAndUpdateCoin(username.toLowerCase());
            const betDb = db.collection("betDataMap").doc(betId);
            await betDb.set({
              userId: username,
              stake: stake,
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
              const {
                id,
                commission,
                myComm,
                percent,
                commissionAmount,
                commissionPercentage,
              } = profitList[i];
              const profitAmount = Math.abs(
                lossList.filter((x) => x.id === id)[0].commission
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
            res.send({ msg: "Bet Placed Successfully!", status: 1 });
          } else {
            res.send({ msg: "Session Changed.", status: 0 });
          }
        }
      }
    }
  },
  async getUserBets(req, res) {
    const userId = req.user.email.split("@")[0];
    const userRef = db.collection("betUserMap").where("player", "==", userId);
    userRef.get().then((value) => {
      const data = value.docs.map((doc) => doc.data());
      const arr = [];
      for (var i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.settled) {
          if (arr.filter((x) => x.matchname === row.matchname).length) {
            if (row.won && row.won === true) {
              arr.filter((x) => x.matchname === row.matchname)[0].sum +=
                row.profitAmount;
            } else {
              arr.filter((x) => x.matchname === row.matchname)[0].sum -=
                row.lossAmount;
            }
          } else {
            const sum =
              row.won && row.won === true
                ? row.profitAmount
                : -1 * row.lossAmount;
            arr.push({
              matchId: row.matchId,
              matchname: row.matchname,
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
