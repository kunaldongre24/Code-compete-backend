const axios = require("axios");

const querystring = require("querystring");
const MatchList = require("../models/MatchList");

const cache = new Map();
const eventIdMap = {};

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
    events.filter((x) => x.name === matchInfo.eventName).length > 0
      ? events.filter((x) => x.name === matchInfo.eventName)[0].event_id
      : matchId;
  eventIdMap[matchId] = eventId;
}
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

const getApiData6 = async (matchId) => {
  try {
    const cachedData = cache.get(matchId);
    if (cachedData && Date.now() - cachedData.timestamp < 1000) {
      return { status: 1, data: cachedData.data };
    }
    if (!eventIdMap[matchId]) {
      await mapEventId(matchId);
    }
    const url = `https://api.datareddybook.club/api/guest/event/${eventIdMap[matchId]}`;
    const response = await axios.post(
      url,
      {},
      { headers: { origin: "https://reddybook.win" } }
    );

    const data = response.data.data;
    const matchMarketId = data.event.book_makers
      ? data.event.book_makers[0].market_id
      : "";
    const marketIds = data.event.book_makers
      ? data.event.fancy.map((x) => x.market_id)
      : [];
    marketIds.push(matchMarketId);

    const formData = querystring.stringify({ market_ids: marketIds });
    const url2 = `https://odds.starcric.live/ws/getMarketDataNew`;

    const response2 = await axios.post(url2, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        origin: "https://reddybook.win",
      },
    });
    const result = response2.data ? response2.data : [];
    const bmMarket = result.filter((x) => x.split("|")[0] === matchMarketId)[0];
    const bmFields = bmMarket.split("|");
    const teamData = [];
    for (let i = 18; i < bmFields.length; i += 13) {
      const isBallRunning = Number(bmFields[i + 10]);
      const isSuspended = Number(bmFields[i + 11]);
      teamData.push({
        sid: bmFields[i],
        nat: bmFields[i + 1],
        b1: isSuspended || isBallRunning ? 0 : bmFields[i + 6],
        bs1: 1000000,
        l1: isSuspended || isBallRunning ? 0 : bmFields[i + 8],
        ls1: 1000000,
        isBallRunning,
        isSuspended,
        s: bmFields[i + 12],
        sr: bmFields[i],
      });
    }
    const fancyMarket = result.filter((x) => x.split("|")[0] !== matchMarketId);
    const Fancymarket = fancyMarket
      .filter((item) => !isExcluded(item.split("|")[7]))
      .map((row) => {
        const fields = row.split("|");
        const ball_running = Number(fields[32]);
        const suspended = Number(fields[35]);
        const active_rate = Number(fields[29]);
        let b1 = fields[18];
        let bs1 = fields[17];
        let ls1 = fields[19];
        let l1 = fields[20];
        let gstatus = "";
        const bet_allow = fields[13];

        if (ball_running) {
          b1 = 0;
          l1 = 0;
          bs1 = 0;
          ls1 = 0;
          gstatus = "Ball Running";
        } else if (suspended || !active_rate || !bet_allow) {
          b1 = 0;
          l1 = 0;
          bs1 = 0;
          ls1 = 0;
          gstatus = "Suspended";
        }

        return {
          sid: fields[0],
          nat: fields[7],
          bs1,
          b1,
          ls1,
          l1,
          gstatus,
          ball_running,
          suspended,
          srno: fields[38],
        };
      });
    const odds = { BMmarket: { teamData }, Fancymarket };
    cache.set(matchId, { data: odds, timestamp: Date.now() });
    return { status: 1, data: { BMmarket: { bm1: teamData }, Fancymarket } };
  } catch (error) {
    console.error(error);
    return { status: 0, error: error.message || "An error occurred" };
  }
};

module.exports = getApiData6;
