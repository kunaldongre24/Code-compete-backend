const axios = require("axios");
const { db } = require("../db");

const MatchController = {
  async getLiveTime(req, res) {
    res.send({ time: Date.now() });
  },
  async setMatchInfo(req, res) {
    try {
      const { matchId } = req.params;
      const url = "http://marketsarket.in:3000/getcricketmatches";
      const response = await axios.get(url);
      const data = response.data;
      const url2 = `http://139.144.12.137/getbm2?eventId=${matchId}`;
      const response2 = await axios.get(url2);

      const singleMatch = data.filter((x) => x.gameId === matchId);
      const gameRef = db.collection("matchList").doc(matchId);
      const gameSnapshot = await gameRef.get();
      if (
        response2.data.t1 &&
        response2.data.t1.length &&
        !gameSnapshot.exists
      ) {
        const t1 = response2.data.t1[0];
        singleMatch[0].createdOn = Date.now();
        const runnerArray = [];
        for (var i = 0; i < t1.length; i++) {
          const elem = { sid: t1[i].sid, name: t1[i].nat };
          runnerArray.push(elem);
        }
        singleMatch[0].runnerArray = runnerArray;
        singleMatch[0].settled = false;
        await gameRef.set(singleMatch[0]);
        res.send({ status: true });
      } else {
        return res.send({ status: false });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send({
        status: false,
        message: "An error occurred while processing the request",
      });
    }
  },
  async getAllMatchList(req, res) {
    try {
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
        let myComm = 0;
        for (var j = 0; j < arr.length; j++) {
          if (arr[j].name === "matchbet") {
            myComm -= arr[j].comAmount;
            if (arr[j].won) {
              sum -= arr[j].lossAmount;
            } else {
              sum += arr[j].profitAmount;
            }
          } else if (arr[j].name === "sessionbet") {
            myComm -= arr[j].myCom - arr[j].sessionCommission;
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
      res.status(500).send("Internal server error");
    }
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
