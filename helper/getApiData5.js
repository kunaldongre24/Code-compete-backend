const axios = require("axios");
const http = require("http");
const https = require("https");

// Create a cache to store the API responses for 1 second
const cache = new Map();
const isExcluded = (marketName) => {
  const keywordsToExclude = [
    " even ",
    " odd ",
    " to ",
    "caught",
    " face ",
    "highest",
    "playing",
    "favourite",
    " lunch",
    " method",
    " bhav",
    " valid",
    "or more",
  ];
  const lowerCaseMarketName = marketName.toLowerCase();
  return keywordsToExclude.some((keyword) =>
    lowerCaseMarketName.includes(keyword)
  );
};

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const getApiData5 = async (matchId) => {
  // Check if data is available in the cache
  const cachedData = cache.get(matchId);
  if (cachedData && Date.now() - cachedData.timestamp < 1000) {
    return { status: 1, data: cachedData.data };
  }

  try {
    const url = `https://141414.live/api/bm_fancy/${matchId}`;
    const response = await axiosInstance.get(url, {
      headers: {
        origin: "https://www.lc247.live",
      },
    });
    // Cache the response data with a timestamp
    const { data } = response;
    data.Fancymarket = data.Fancymarket
      ? data.Fancymarket.filter((x) => !isExcluded(x.nat))
      : [];
    if (data.BMmarket && data.BMmarket.bm1) {
      data.BMmarket.bm1.forEach((item) => {
        if (item.s !== "ACTIVE") {
          item.b1 = 0;
          item.l1 = 0;
        }
      });
    }
    if (data.Fancymarket) {
      data.Fancymarket.forEach((item) => {
        if (item.gstatus !== "") {
          item.b1 = 0;
          item.l1 = 0;
          item.bs1 = 0;
          item.ls1 = 0;
        }
      });
    }
    cache.set(matchId, { data, timestamp: Date.now() });
    return {
      status: 1,
      data,
    };
  } catch (error) {
    console.error(error);
    return { status: 0 };
  }
};

module.exports = getApiData5;
