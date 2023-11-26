const axios = require("axios");
const { updateMessage, fetchMessage } = require("../models/Message");
const modifyFormat3 = require("../helper/modifyFormat3");
const BetDataMap = require("../models/BetDataMap");
const MatchBet = require("../models/MatchBetMap");
const TossBet = require("../models/TossBetMap");
const getApiData4 = require("../helper/getApiData4");

const ApiController = {
  async setMessage(req, res) {
    const { message } = req.body;
    try {
      if (req.user.level !== 1) {
        return res.send({ status: false, msg: "Insufficient Permission." });
      }
      await updateMessage(message);
      res.send({ status: true, msg: "Message Updated Successfully." });
    } catch (err) {
      console.log(err);
      res.send({ status: false, err: "Message not published." });
    }
  },
  async getMessage(req, res) {
    try {
      const message = await fetchMessage();
      res.send(message);
    } catch (err) {
      console.error(err);
      res.send({ status: false, err: "Error fetching message." });
    }
  },
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
  async getUserMatchList(req, res) {
    try {
      const userId = req.user.username;
      const apiUrl = "https://111111.info/pad=82/listGames?sport=4";

      // Fetch data from the API
      const apiResponse = await axios.get(apiUrl);
      const apiData = apiResponse.data.result.filter(
        (x) => (x.isFancy || x.isBm) && x.isPremium
      );
      // Create an array of promises for database queries
      const betDataPromises = apiData.map(async (row) => {
        const matchBetCountPromise = MatchBet.countDocuments({
          matchId: row.eventId,
          userId,
        }).exec();
        const tossBetCountPromise = TossBet.countDocuments({
          matchId: row.eventId,
          userId,
        }).exec();
        const sessionBetCountPromise = BetDataMap.countDocuments({
          matchId: row.eventId,
          userId,
        }).exec();

        // Wait for all promises to resolve
        const [matchBetCount, tossBetCount, sessionBetCount] =
          await Promise.all([
            matchBetCountPromise,
            tossBetCountPromise,
            sessionBetCountPromise,
          ]);

        // Update the row with counts
        row.matchBetCount = matchBetCount + tossBetCount;
        row.sessionBetCount = sessionBetCount;

        return row;
      });

      // Wait for all promises to resolve
      const filteredData = await Promise.all(betDataPromises);

      res.send(filteredData);
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: "An error occurred" });
    }
  },
  async getTOdds(req, res) {
    try {
      const { matchId } = req.params;
      const response = await getApiData4(matchId);
      res.send(response.data);
    } catch (error) {
      console.error(error);
      res.send({ error: "An error occurred" });
    }
  },
};

module.exports = ApiController;
