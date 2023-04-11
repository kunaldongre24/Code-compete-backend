const axios = require("axios");
const getMatchScore = async (matchId, socket) => {
  try {
    const url = "http://172.105.61.186:3000/getscore2?marketId=" + matchId;
    const response = await axios.get(url);
    socket.emit("matchScore", response.data);
  } catch (error) {
    console.error(error);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMatchScore;
