const axios = require("axios");
const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");

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
      await gameRef.set(singleMatch[0]);
      res.send({ status: true });
    } catch (error) {
      res.send({ err: error });
    }
  },
  async getAllMatchList(req, res) {
    const userId = req.user.email.split("@")[0];
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
      for (var j = 0; j < arr.length; j++) {
        if (arr[j].won) {
          sum -= arr[j].lossAmount;
        } else {
          sum += arr[j].profitAmount;
        }
      }
      value[i].winning = sum;
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
  async getMatchScore(req, res) {
    const { eventId } = req.params;
    const url = `http://172.105.35.224:3000/getbm2?eventId=${eventId}`;
    const response = await axios.get(url);
    res.send(response.data);
  },
  async getMatchOdds(req, res) {
    const { eventId } = req.params;
    const url = `http://172.105.35.224:3000/getbm2?eventId=${eventId}`;
    const response = await axios.get(url);
    res.send(response.data);
  },
  async oddsResult(req, res) {
    const { eventId, fancyName } = req.params;
    const url = `https://betfairoddsapi.com:3456/api/fancy_result/${eventId}/${fancyName}`;
    const response = await axios.get(url);
    res.send(response.data);
  },
};

module.exports = MatchController;
