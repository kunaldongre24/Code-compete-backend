const axios = require("axios");
const http = require("http");
const https = require("https");

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getApiData = async (matchId) => {
  try {
    if (!data.matchId || typeof data.matchId !== "string") {
      throw new Error("Invalid matchId");
    }
    const url = `https://api3.streamingtv.fun:3459/api/bm_fancy/${matchId}`;
    const response = await axiosInstance.get(url,{
      headers: {
        origin: 'https://www.lc247.live',
      },
    });
    return {status:1, data:response.data};
  } catch (error) {
    console.error(error.code);
    return {status:0}
  }
};

module.exports = getApiData;
