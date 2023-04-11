const { resolveBet, resolveMatchBet } = require("../controllers/BetController");
const { db } = require("../db");
const axios = require("axios");
const ResolveResult = async () => {
  try {
    const betRef = db.collection("betDataMap").where("settled", "!=", true);
    const response = await betRef.get();
    const data = response.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    const matchBetRef = db
      .collection("matchBetMap")
      .where("settled", "!=", true);
    const matchResponse = await matchBetRef.get();
    const matchBetData = matchResponse.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    var resultData = [];
    const unique = [...new Set(data.map((item) => item.matchId))];
    const uniqueFancy = [...new Set(data.map((item) => item.fancyName))];
    const matchUnique = [...new Set(matchBetData.map((item) => item.marketId))];

    for (var i = 0; i < unique.length; i++) {
      const url =
        "http://172.105.49.104:3000/resultbygameid?eventId=" + unique[i];
      const res = await axios.get(url);
      if (!res.data.status) {
        resultData = [...resultData, ...res.data];
      }
    }
    for (var i = 0; i < uniqueFancy.length; i++) {
      if (resultData.filter((x) => x.nat === uniqueFancy[i]).length > 0) {
        const result = resultData.filter((x) => x.nat === uniqueFancy[i])[0]
          .result;
        if (result >= 0) {
          resolveBet(uniqueFancy[i], result);
        }
      }
    }
    for (var i = 0; i < matchUnique.length; i++) {
      const url = "http://178.79.149.218:4000/listmarketbook/" + matchUnique[i];
      const res = await axios.get(url);
      const runnerList = res.data.length > 0 && res.data[0];
      const winnerSid =
        runnerList.status && runnerList.runners
          ? runnerList.runners.filter((x) => x.status === "WINNER").length > 0
            ? runnerList.runners.filter((x) => x.status === "WINNER")[0]
                .selectionId
            : 0
          : 0;
      if (winnerSid > 0) {
        resolveMatchBet(matchUnique[i], winnerSid);
      }
    }

    console.log("Bet Resolved");
  } catch (error) {
    console.log(error);
  }
};
module.exports = ResolveResult;
