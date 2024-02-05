const axios = require("axios");
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const cheerio = require("cheerio"); // Import the cheerio library for parsing HTML
const MatchList = require("../models/MatchList");

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
const eventIdMap = {};

async function mapEventId(matchId) {
  const matchInfo = await MatchList.findOne({ eventId: matchId });
  const url = `https://api.reddybook.club/api/guest/event_list`;
  const response = await axios.get(url, {
    headers: {
      Origin: "https://reddybook.club",
    },
  });
  const data = response.data.data;
  const events = data.events;
  const eventId =
    events.filter(
      (x) => x.name.toLowerCase() === matchInfo.eventName.toLowerCase()
    ).length > 0
      ? events.filter(
          (x) => x.name.toLowerCase() === matchInfo.eventName.toLowerCase()
        )[0].event_id
      : matchId;
  eventIdMap[matchId] = eventId;
}

const getScore = async (matchId) => {
  try {
    if (!matchId || typeof matchId !== "string") {
      throw new Error("Invalid matchId");
    }

    if (!eventIdMap[matchId]) {
      await mapEventId(matchId);
    }
    const url = `https://odds.starcric.live/ws/getScoreData`;
    const requestData = querystring.stringify({
      event_id: eventIdMap[matchId],
    });
    const response = await axiosInstance.post(url, requestData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const $ = cheerio.load(response.data);

    // Extract data from HTML
    const team1 = $(".team:first-child .team_name").text();
    const team2 = $(".team:last-child .team_name").text();
    const score1 = $(".team:first-child .curr_inn .run")
      .map(function () {
        return $(this).text();
      })
      .get()
      .join(" ");
    const score2 = $(".team:last-child .curr_inn .run")
      .map(function () {
        return $(this).text();
      })
      .get()
      .join(" ");
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

    // Extract score-over as an array
    const scoreOverArray = [];
    $(".six-balls").each(function () {
      const runText = $(this).text().trim();
      scoreOverArray.push(runText);
    });

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
      scoreOver: scoreOverArray, // Add the score-over array
    };
    // Emit the matchScore event with the extracted data
    return matchData;
  } catch (error) {
    console.error(error);
    return {};
  }
};

module.exports = { getScore };
