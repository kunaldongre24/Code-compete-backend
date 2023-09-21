const axios = require("axios");
let storedOdds = [];
const scoreIds = [];
let scoreData = [];
const reddyScoreScrape = require("../helper/reddyScore");
const ApiController = {
  async getMatchlist(req, res) {
    try {
      const apiUrl = "https://111111.info/pad=82/listGames?sport=4&inplay=1";
      const apiResponse = await axios.get(apiUrl);
      const filteredData = apiResponse.data.filter(
        (x) => x.isFancy === true && isFancy === true
      );
      res.send(filteredData);
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

  async getTOdds(req, res) {
    try {
      const { eventId } = req.params;
      const apiUrl = `https://api3.streamingtv.fun:3459/api/bm_fancy/${eventId}`;

      const apiResponse = await axios.get(apiUrl, {
        headers: {
          origin: "https://www.lc247.live",
        },
      });

      res.send(apiResponse.data);
    } catch (error) {
      console.error(error);
      res.send({ error: "An error occurred" });
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
