const axios = require("axios");
const getMatchOdds = async (matchId, socket) => {
  try {
    const url = `http://139.144.12.137/getbm2?eventId=${matchId}`;
    const response = await axios.get(url);
    socket.emit("matchOdds", response.data);
  } catch (error) {
    console.error(error);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMatchOdds;
