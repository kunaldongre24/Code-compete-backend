const axios = require("axios");
const { updateMessage, fetchMessage } = require("../models/Message");
const modifyFormat3 = require("../helper/modifyFormat3");

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

  async getTOdds(req, res) {
    try {
      const { matchId } = req.params;
      const url = `https://cf.iceexchange.com/exchange/v1/dashboard/getFancyEventDetails?eventId=${matchId}`;
      const response = await axios.get(url, {
        headers: {
          origin: "https://www.iceexchange.com",
        },
      });
      if (response.data.status !== "OK") {
        return res.send({ msg: "Fetching Failed" });
      }
      const { data } = response.data;
      const bookmaker = data.filter(
        (x) => x.markets[0].fancyCategory === "Bookmaker_Market"
      )[0].markets;
      const fancy = data.filter(
        (x) => x.markets[0].fancyCategory === "Fancy_Market"
      )[0].markets;
      const format = modifyFormat3(
        bookmaker[0].runners,
        fancy,
        response.data.timestamp
      );
      res.send({ format });
    } catch (error) {
      console.error(error);
      res.send({ error: "An error occurred" });
    }
  },
};

module.exports = ApiController;
