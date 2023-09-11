const axios = require("axios");
let storedOdds = [];
let { scrapeDynamicContent } = require("../helper/scraptest");
const ids = [];
const scoreIds = [];
let scoreData = [];
const reddyScoreScrape = require("../helper/reddyScore");
const cache = {};
const ApiController = {
  async getMatchlist(req, res) {
    try {
      const apiUrl = "https://betplace247.com/api/client/clientcricket";
      const apiResponse = await axios.get(apiUrl);
      res.send(apiResponse.data);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  },
  async getMatchScore(req, res) {
    const { eventId } = req.params;
    try {
      const data = { eventId };
      if (!scoreIds.some((x) => x.eventId === eventId)) {
        scoreIds.push(data);
        reddyScoreScrape(eventId, ApiController.handleScore);
      }
      const cData = scoreData.filter((x) => x.eventId === eventId)[0];
      res.send(cData);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  },
  async getOddsData(eventId, marketId) {
    try {
      const apiUrl = "https://betplace247.com/api/client/clientgetFullMarket";
      const apiResponse = await axios.post(apiUrl, { eventId });
      const t1 = [];
      let { data } = apiResponse;
      if (data.length > 0) {
        const runnerId1 = data[0].runnerId1;
        const runnerName1 = data[0].runnerName1;

        if (runnerId1 && runnerName1) {
          t1.push({ sid: runnerId1, nat: runnerName1, sr: 1 });
        }

        const runnerId2 = data[0].runnerId2;
        const runnerName2 = data[0].runnerName2;

        if (runnerId2 && runnerName2) {
          t1.push({ sid: runnerId2, nat: runnerName2, sr: 2 });
        }
        const runnerId3 = data[0].runnerId3;
        const runnerName3 = data[0].runnerName3;

        if (runnerId3 && runnerName3) {
          t1.push({ sid: runnerId3, nat: runnerName3, sr: 3 });
        }
      }
      data = { eventId, marketId };
      if (!ids.some((x) => x.eventId === eventId)) {
        ids.push(data);
        scrapeDynamicContent(eventId, marketId, ApiController.handleOdds);
      }
      const cData = storedOdds.filter((x) => x.eventId === eventId)[0];
      if (cData) {
        cData.t1 = t1;
      }
      return cData;
    } catch (error) {
      console.log(error);
      return;
    }
  },
  async getOdds(req, res) {
    const { eventId, marketId } = req.params;
    try {
      const cData = await ApiController.getOddsData(eventId, marketId);
      res.send(cData);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  },
  async getTOdds(req, res) {
    try {
      const { eventId } = req.params;
      const apiUrl =
        "https://api3.streamingtv.fun:3459/api/bm_fancy/" + eventId;

      const apiResponse = await axios.get(apiUrl, { headers: {
        origin: "https://www.lc247.live"
      }});
      const cData = apiResponse.data;
      res.send(cData);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  },
  async getMatchOdds(data, socket) {
    try {
      if (!data.matchId || typeof data.matchId !== "string") {
        throw new Error("Invalid matchId");
      }
      if (!ids.some((x) => x.eventId === data.matchId)) {
        ids.push({ eventId: data.matchId, marketId: data.marketId });
        scrapeDynamicContent(
          data.matchId,
          data.marketId,
          ApiController.handleOdds
        );
      }
      socket.emit(
        "matchOdds",
        storedOdds.filter((x) => x.eventId === data.matchId)[0]
      );
    } catch (error) {
      console.error(error.code);
      socket.emit("error", "Internal server error");
    }
  },
  async matchWebSocket(eventId, socket) {
    try {
      const data = { eventId };
      if (!scoreIds.some((x) => x.eventId === eventId)) {
        scoreIds.push(data);
        reddyScoreScrape(eventId, ApiController.handleScore);
      }
      const cData = scoreData.filter((x) => x.eventId === eventId)[0];
      socket.emit("matchScore", cData);
    } catch (error) {
      console.log(error);
      socket.emit("error", "Internal Server error");
    }
  },
  handleOdds(data) {
    storedOdds = [
      ...storedOdds.filter((x) => x.eventId !== data.eventId),
      data,
    ];
  },
  handleScore(data) {
    scoreData = [...scoreData.filter((x) => x.eventId !== data.eventId), data];
  },
};

module.exports = ApiController;
