const axios = require("axios");
const http = require("http");
const https = require("https");

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getMatchOdds = async (data, socket) => {
  try {
    if (!data.matchId || typeof data.matchId !== "string") {
      throw new Error("Invalid matchId");
    }
    const url = `https://fly247.tech/api/v1/api/getOdds/${data.matchId}/${data.marketId}`;
    const response = await axiosInstance.get(url);
    socket.emit("matchOdds", response.data);
  } catch (error) {
    console.error(error.code);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMatchOdds;
