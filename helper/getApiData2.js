const axios = require("axios");
const http = require("http");
const https = require("https");
const modifyFormat2 = require("./modifyFormat2");

// Create a cache to store the API responses for 1 second
const cache = new Map();

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getApiData2 = async (matchId) => {
  // Check if data is available in the cache
  const cachedData = cache.get(matchId);
  if (cachedData && Date.now() - cachedData.timestamp < 1000) {
    return { status: 1, data: cachedData.data };
  }

  try {
    const url = `https://api.babaexch.co/catalog/v2/sports-feed/sports/markets`;
    const response = await axiosInstance.post(
      url,
      {
        providerId: "BetFair",
        marketsCriteria: "ALL",
        eventDetails: [{ sportId: "4", eventId: matchId }],
      },
      {
        headers: {
          origin: "https://www.babaexch.co",
        },
      }
    );
    if (response.data.length === 0) {
      return { status: 0 };
    }
    const data = response.data[0].markets;
    const bookmaker = data.bookmaker.length ? data.bookmakers[0].runners : [];
    const bookmakerStatus = data.bookmakers[0].status;
    const fancy = data.fancyMarkets;
    const marketTime = response.data[0].openDate;
    const format = modifyFormat2(bookmaker, fancy, marketTime, bookmakerStatus);
    // Cache the response data with a timestamp
    cache.set(matchId, { data: format, timestamp: Date.now() });
    return { status: 1, data: format };
  } catch (error) {
    console.error(error);
    return { status: 0 };
  }
};

module.exports = getApiData2;
