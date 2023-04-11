const axios = require("axios");
const BetController = require("../controllers/BetController");
const getUserFromToken = require("../middleware/getUserFromToken");

const getMyPlayerBets = async (pData, socket) => {
  try {
    const userdata = await getUserFromToken(pData.token);
    const userId = userdata.email.split("@")[0];
    const url = `http://139.144.12.137/getbm2?eventId=${pData.matchId}`;
    const response = await axios.get(url);
    const data = await BetController.getMyPlayerBets(pData.matchId, userId);
    const betData = { odds: response.data, betData: data };
    socket.emit("myPlayerBets", betData);
  } catch (error) {
    console.error(error);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMyPlayerBets;
