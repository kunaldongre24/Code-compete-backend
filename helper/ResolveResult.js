const { resolveBet, resolveMatchBet } = require("../controllers/BetController");
const axios = require("axios");
const BetDataMap = require("../models/BetDataMap");
const MatchList = require("../models/MatchList");
const BetUserMap = require("../models/BetUserMap");

const ResolveResult = async () => {
  try {
    const betsToResolve = await BetUserMap.find({ settled: false });
    const matchesToResolve = await MatchList.find({ settled: false });

    const uniqueMatches = [
      ...new Set(betsToResolve.map(({ matchId }) => matchId)),
    ];
    const uniqueFancyNames = [
      ...new Set(betsToResolve.map(({ fancyName }) => fancyName)),
    ];

    const resultDataPromises = uniqueMatches.map((id) =>
      axios.get(`http://172.105.49.104:3000/resultbygameid?eventId=${id}`)
    );
    const resultDataResponses = await Promise.all(resultDataPromises);
    const resultData = resultDataResponses
      .filter(({ data }) => !data.status)
      .flatMap(({ data }) => data);

    const resolveBetPromises = [];
    uniqueFancyNames.forEach((fancyName) => {
      const result = resultData.find(({ nat }) => nat === fancyName)?.result;
      if (result >= 0) {
        resolveBetPromises.push(resolveBet(fancyName, result));
      }
    });
    await Promise.allSettled(resolveBetPromises);

    const matchBetPromises = [];
    for (const match of matchesToResolve) {
      const { marketId, gameId } = match;
      const res = await axios.get(
        `http://178.79.149.218:4000/listmarketbook/${marketId}`
      );
      const runnerList = res.data.length > 0 && res.data[0];
      const winnerSid =
        runnerList?.status && runnerList.runners
          ? runnerList.runners.filter(({ status }) => status === "WINNER")
              .length > 0
            ? runnerList.runners.find(({ status }) => status === "WINNER")
                .selectionId
            : 0
          : 0;
      if (winnerSid > 0) {
        matchBetPromises.push(resolveMatchBet(marketId, winnerSid, gameId));
      }
    }
    await Promise.allSettled(matchBetPromises);

    console.log("Bet Resolved");
  } catch (error) {
    console.log(error.code);
  }
};

module.exports = ResolveResult;
