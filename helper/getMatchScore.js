const axios = require("axios");
const http = require("http");
const https = require("https");

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getMatchScore = async (matchId, socket) => {
  try {
    if (!matchId || typeof matchId !== "string") {
      throw new Error("Invalid matchId");
    }
    const url = `http://172.105.61.186:3000/getscore2?marketId=${matchId}`;
    const response = await axiosInstance.get(url);
    socket.emit("matchScore", response.data);
  } catch (error) {
    console.error(error.code);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMatchScore;
