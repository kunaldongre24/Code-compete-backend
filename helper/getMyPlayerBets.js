const axios = require("axios");
const BetController = require("../controllers/BetController");
const getUserFromToken = require("../middleware/getUserFromToken");
const { getOddsData } = require("../controllers/ApiController");

const getMyPlayerBets = async (pData, socket) => {
  try {
    const userdata = await getUserFromToken(pData.token);
    const userId = userdata.email.split("@")[0];
    const cData = await getOddsData(pData.matchId, pData.marketId);
    const data = await BetController.getMyPlayerBets(pData.matchId, userId);
    const betData = { odds: cData, betData: data };
    socket.emit("myPlayerBets", betData);
  } catch (error) {
    console.error(error);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMyPlayerBets;
