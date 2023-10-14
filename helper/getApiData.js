const axios = require("axios");
const http = require("http");
const https = require("https");
const modifyFormat = require("./modifyFormat");

// Create a cache to store the API responses for 1 second
const cache = new Map();

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getApiData = async (matchId) => {
  // Check if data is available in the cache
  const cachedData = cache.get(matchId);
  if (cachedData && Date.now() - cachedData.timestamp < 1000) {
    return { status: 1, data: cachedData.data };
  }

  try {
    const url = `https://ssexch.io/exchangeapi/fancy/markets/v1/${matchId}`;
    const response = await axiosInstance.get(url, {
      headers: {
        origin: "https://www.ssexch.io",
      },
    });
    const { bookMaker, fancy } = response.data;
    const format = modifyFormat(bookMaker, fancy);

    // Cache the response data with a timestamp
    cache.set(matchId, { data: format, timestamp: Date.now() });
    return { status: 1, data: format };
  } catch (error) {
    console.error(error);
    return { status: 0 };
  }
};

module.exports = getApiData;
