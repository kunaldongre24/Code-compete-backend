const axios = require("axios");
const http = require("http");
const https = require("https");
const modifyFormat = require("./modifyFormat");
const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
const getApiData = async (matchId) => {
  try {
    const url = `https://ssexch.io/exchangeapi/fancy/markets/v1/${matchId}`;
    const response = await axiosInstance.get(url, {
      headers: {
        origin: "https://www.ssexch.io",
      },
    });
    const { bookMaker, fancy } = response.data;
    const format = modifyFormat(bookMaker, fancy);
    return { status: 1, data: format };
  } catch (error) {
    console.error(error);
    return { status: 0 };
  }
};

module.exports = getApiData;
