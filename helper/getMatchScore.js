const axios = require("axios");
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const cheerio = require("cheerio"); // Import the cheerio library for parsing HTML
const MatchList = require("../models/MatchList");
const getTeamIcon = require("./getTeamIcon");

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
const scoreCache = new Map();
const eventIdMap = {};
const iconMap = {};
async function mapTeamIcon(teamName) {
  const iconUrl = await getTeamIcon(teamName.trim());
  iconMap[teamName] = iconUrl;
}
async function mapEventId(matchId) {
  const matchInfo = await MatchList.findOne({ eventId: matchId });
  const url = `https://api.datareddybook.club/api/guest/event_list`;
  const response = await axios.get(url, {
    headers: {
      Origin: "https://reddybook.win",
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
    const randomParam = `random=${Math.random()}`;

    if (!eventIdMap[matchId]) {
      await mapEventId(matchId);
    }
    const url = `https://odds.starcric.live/ws/getScoreData?${randomParam}`;
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
    if (!iconMap[team1]) {
      await mapTeamIcon(team1);
    }
    if (!iconMap[team2]) {
      await mapTeamIcon(team2);
    }
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
      team1Icon: iconMap[team1],
      team2Icon: iconMap[team2],
      scoreOver: scoreOverArray, // Add the score-over array
    };
    scoreCache.set(matchId, { data: matchData, timestamp: Date.now() });
    // Emit the matchScore event with the extracted data
    socket.emit("matchScore", matchData);
  } catch (error) {
    console.error(error);
    socket.emit("matchScore", {});
  }
};

module.exports = { getMatchScore, iconMap };
