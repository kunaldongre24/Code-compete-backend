const axios = require("axios");
const { scrapeDynamicContent } = require("../helper/scraptest");
const modifyFormat = require("../helper/modifyFormat");
let storedOdds = [];
const ids = [];

const ApiController = {
  async getMatchlist(req, res) {
    try {
      const apiUrl = "https://111111.info/pad=82/listGames?sport=4";
      const apiResponse = await axios.get(apiUrl);
      const filteredData = apiResponse.data.result.filter(
        (x) => (x.isFancy || x.isBm) && x.isPremium
      );
      res.send(filteredData);
    } catch (error) {
      console.log(error);
      res.send({ error });
    }
  },

  async getTOdds(req, res) {
    try {
      const { matchId } = req.params;
      const url = `https://ssexch.io/exchangeapi/fancy/markets/v1/${matchId}`;
      const response = await axios.get(url, {
        headers: {
          origin: "https://www.ssexch.io",
        },
      });
      const { bookMaker, fancy } = response.data;
      const format = modifyFormat(bookMaker, fancy);
      res.send(format);
    } catch (error) {
      console.error(error);
      res.send({ error: "An error occurred" });
    }
  },
  async getMatchOdds(data, socket) {
    // try {
    //   if (!data.matchId || typeof data.matchId !== "string") {
    //     throw new Error("Invalid matchId");
    //   }
    //   if (!ids.some((x) => x.eventId === data.matchId)) {
    //     ids.push({ eventId: data.matchId });
    //     await scrapeDynamicContent(data.matchId, ApiController.handleOdds);
    //   }
    //   const filteredOdds = storedOdds.filter(
    //     (x) => x.eventId === data.matchId
    //   )[0];
    //   socket.emit("matchOdds", filteredOdds);
    // } catch (error) {
    //   console.error(error);
    //   socket.emit("error", "Internal server error");
    // }
  },
  handleOdds(data) {
    // storedOdds = [
    //   ...storedOdds.filter((x) => x.eventId !== data.eventId),
    //   data,
    // ];
  },
};

module.exports = ApiController;
