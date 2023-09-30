const getApiData = require("./getApiData");

const getMatchOdds = async (data, socket) => {
  try {
    if (!data.matchId || typeof data.matchId !== "string") {
      throw new Error("Invalid matchId");
    }
    const response = await getApiData(data.matchId);
    if (response.status) {
      const format = response.data;
      socket.emit("matchOdds", format);
    } else {
      socket.emit("error", "Internal server error");
    }
  } catch (error) {
    console.error(error);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMatchOdds;
