const axios = require("axios");
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const cheerio = require("cheerio"); // Import the cheerio library for parsing HTML

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
const scoreCache = new Map();

const getMatchScore = async (matchId, socket) => {
  try {
    if (!matchId || typeof matchId !== "string") {
      throw new Error("Invalid matchId");
    }
    const cachedScoreData = scoreCache.get(matchId);
    if (cachedScoreData && Date.now() - cachedScoreData.timestamp < 1000) {
      socket.emit("matchScore", cachedScoreData.data);
      return;
    }

    const url = `https://odds.starcric.live/ws/getScoreData`;
    const requestData = querystring.stringify({ event_id: matchId });
    const response = await axiosInstance.post(url, requestData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const $ = cheerio.load(response.data);

    // Extract data from HTML
    const team1 = $(".team:first-child .team_name").text();
    const team2 = $(".team:last-child .team_name").text();
    const score1 = $(".team:first-child .curr_inn .run").text();
    const score2 = $(".team:last-child .curr_inn .run").text();
    const message = $(".target").text();
    const status = $(".commantry").text();
    const team1RunRate = $(
      ".team:first-child .curr_inn .over:last-child"
    ).text();
    const team2RunRate = $(
      ".team:last-child .curr_inn .over:last-child"
    ).text();
    const team1Over = $(".team:first-child .curr_inn span:nth-child(2)").text();
    const team2Over = $(".team:last-child .curr_inn span:nth-child(2)").text();

    // Create an object to store the extracted data
    const matchData = {
      team1,
      team2,
      team1Over,
      team2Over,
      score1,
      score2,
      message,
      status,
      team1RunRate,
      team2RunRate,
    };
    scoreCache.set(matchId, { data: matchData, timestamp: Date.now() });
    // Emit the matchScore event with the extracted data
    socket.emit("matchScore", matchData);
  } catch (error) {
    console.error(error);
    socket.emit("error", "Internal server error");
  }
};

module.exports = getMatchScore;
