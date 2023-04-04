require("dotenv").config();
const express = require("express");
const app = express();
const indexRouter = require("./routes/index");
const compression = require("compression");
const logger = require("morgan");
var cors = require("cors");
const cron = require("node-cron");
const { db } = require("./db");
const { resolveBet, resolveMatchBet } = require("./controllers/BetController");
const axios = require("axios");

const { PORT } = process.env;
app.disable("etag");

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://fly247.in",
      "https://ma.fly247.in",
      "https://ng.fly247.in",
    ],
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  })
); // Use this after the variable declaration
async function myFunction() {
  try {
    const betRef = db.collection("betDataMap").where("settled", "!=", true);
    const response = await betRef.get();
    const data = response.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    const matchBetRef = db
      .collection("matchBetMap")
      .where("settled", "!=", true);
    const matchResponse = await matchBetRef.get();
    const matchBetData = matchResponse.docs.map((doc) => {
      const document = doc.data();
      document.id = doc.id;
      return document;
    });
    var resultData = [];
    var matchResultData = [];
    const unique = [...new Set(data.map((item) => item.matchId))];
    const uniqueFancy = [...new Set(data.map((item) => item.fancyName))];
    const matchUnique = [...new Set(matchBetData.map((item) => item.marketId))];

    for (var i = 0; i < unique.length; i++) {
      const url =
        "http://172.105.49.104:3000/resultbygameid?eventId=" + unique[i];
      const res = await axios.get(url);
      if (!res.data.status) {
        resultData = [...resultData, ...res.data];
      }
    }
    for (var i = 0; i < uniqueFancy.length; i++) {
      if (resultData.filter((x) => x.nat === uniqueFancy[i]).length > 0) {
        const result = resultData.filter((x) => x.nat === uniqueFancy[i])[0]
          .result;
        if (result >= 0) {
          resolveBet(uniqueFancy[i], result);
        }
      }
    }
    for (var i = 0; i < matchUnique.length; i++) {
      const url = "http://178.79.149.218:4000/listmarketbook/" + matchUnique[i];
      const res = await axios.get(url);
      const runnerList = res.data.length > 0 && res.data[0];
      const winnerSid =
        runnerList.status && runnerList.runners
          ? runnerList.runners.filter((x) => x.status === "WINNER").length > 0
            ? runnerList.runners.filter((x) => x.status === "WINNER")[0]
                .selectionId
            : 0
          : 0;
      if (winnerSid > 0) {
        resolveMatchBet(matchUnique[i], winnerSid);
      }
    }

    console.log("Bet Resolved");
  } catch (error) {
    console.log(error);
  }
}
cron.schedule("*/30 * * * * *", myFunction);
app.use("/static", express.static("static"));
app.use(compression());
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/v1/", indexRouter);
// catch 404 and forward to erro  r handler

const port = PORT || 8000;
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
