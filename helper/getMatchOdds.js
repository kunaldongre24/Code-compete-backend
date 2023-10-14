const apiSwitch = require("./apiSwitch");

const getMatchOdds = async (data, socket) => {
  try {
    if (!data.matchId || typeof data.matchId !== "string") {
      throw new Error("Invalid matchId");
    }
    const response = await apiSwitch(data.matchId);
    if (response.status) {
      const format = response.data;
      socket.emit("matchOdds", format);
    } else {
      socket.emit("matchOdds", {});
    }
  } catch (error) {
    console.error(error);
    socket.emit("matchOdds", {});
  }
};

module.exports = getMatchOdds;
