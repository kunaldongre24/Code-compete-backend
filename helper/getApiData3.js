const axios = require("axios");
const http = require("http");
const https = require("https");
const modifyFormat3 = require("./modifyFormat3");

// Create a cache to store the API responses for 1 second
const cache = new Map();

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getApiData3 = async (matchId) => {
  // Check if data is available in the cache
  const cachedData = cache.get(matchId);
  if (cachedData && Date.now() - cachedData.timestamp < 1000) {
    return { status: 1, data: cachedData.data };
  }

  try {
    const url = `https://cf.iceexchange.com/exchange/v1/dashboard/getFancyEventDetails?eventId=${matchId}`;
    const response = await axiosInstance.get(url, {
      headers: {
        origin: "https://www.iceexchange.com",
      },
    });
    const { data } = response.data;
    if (data.length === 0) {
      return { status: 0 };
    }
    const bookmaker = data.filter(
      (x) => x.markets[0].fancyCategory === "Bookmaker_Market"
    )[0].markets;
    const fancy = data.filter(
      (x) => x.markets[0].fancyCategory === "Fancy_Market"
    )[0].markets;

    const format = modifyFormat3(
      bookmaker[0].runners,
      fancy,
      response.data.timestamp
    );
    // Cache the response data with a timestamp
    cache.set(matchId, { data: format, timestamp: Date.now() });
    return { status: 1, data: format };
  } catch (error) {
    console.error(error);
    return { status: 0 };
  }
};

module.exports = getApiData3;
