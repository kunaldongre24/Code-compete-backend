const axios = require("axios");
const { db } = require("../db");

const MatchController = {
  async setMatchInfo(req, res) {
    const { matchId } = req.params;
    const url = "http://marketsarket.in:3000/getcricketmatches";
    const response = await axios.get(url);
    const data = response.data;
    const singleMatch = data.filter((x) => x.gameId === matchId);
    const gameRef = db.collection("matchList").doc(matchId);
    const gameSnapshot = await gameRef.get();
    if (gameSnapshot.exists) {
      return res.send({ status: false });
    }
    try {
      singleMatch[0].createdOn = Date.now();
      await gameRef.set(singleMatch[0]);
      res.send({ status: true });
    } catch (error) {
      res.send({ err: error });
    }
  },
  async getAllMatchList(req, res) {
    const { userId } = req.params;
    const betRef = db
      .collection("betUserMap")
      .where("company", "==", userId)
      .where("settled", "==", true);
    const response = await betRef.get();
    const data = response.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    const matchRef = db.collection("matchList");
    const resp = await matchRef.get();
    const value = resp.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });

    for (var i = 0; i < value.length; i++) {
      let sum = 0;
      const arr = data.filter((x) => x.matchId === value[i].id);
      var runnerArray = [];
      var winner = [];
      let sessionSum = 0;
      let matchCommission = 0;
      let myShareCom = 0;
      let settled = false;
      for (var j = 0; j < arr.length; j++) {
        const matchCom = arr[j].won
          ? arr[j].lossCommAmount - arr[j].lossCom
          : arr[j].profitComAmount - arr[j].profitCom;
        runnerArray = arr[j].runnerArray;
        sessionSum += arr[j].sessionCommission ? arr[j].sessionCommission : 0;
        matchCommission += matchCom ? matchCom : 0;
        myShareCom += arr[j].myCom;
        winner = arr[j].winner;
        settled = arr[j].settled;
        if (arr[j].won) {
          sum -= arr[j].lossAmount;
        } else {
          sum += arr[j].profitAmount;
        }
      }
      value[i].runnerArray = runnerArray;
      value[i].winner = winner;
      value[i].winning = sum;
      value[i].totalCom = sessionSum + matchCommission;
      value[i].myShareCom = myShareCom;
      value[i].settled = settled;
    }
    res.send(value);
  },
  async getSingleMatch(req, res) {
    const { matchId } = req.params;
    const matchRef = db.collection("matchList").doc(matchId);
    await matchRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },
  async getMatches(req, res) {
    const url = `http://marketsarket.in:3000/getcricketmatches`;
    const response = await axios.get(url);
    res.send(response.data);
  },

  async fancyResult(req, res) {
    const { eventId, fancyName } = req.body;
    const result = await MatchController.oddsResult(eventId, fancyName);
    res.send({ result });
  },
  async oddsResult(eventId, fancyName) {
    const url = "http://172.105.49.104:3000/resultbygameid?eventId=" + eventId;
    const response = await axios.get(url);
    const data = response.data;
    const result = data.filter((x) => x.nat === fancyName)[0].result;
    return result;
  },
  async matchResult(req, res) {
    const { eventId } = req.params;
    const url = "http://172.105.49.104:3000/resultbygameid?eventId=" + eventId;
    const response = await axios.get(url);
    res.send(response.data);
  },
};

module.exports = MatchController;