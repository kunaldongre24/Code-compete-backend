require("dotenv").config();
const express = require("express");
const app = express();
const indexRouter = require("./routes/index");
const compression = require("compression");
const logger = require("morgan");
var cors = require("cors");
const cron = require("node-cron");
const { db } = require("./db");
const { resolveBet } = require("./controllers/BetController");
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
  const betRef = db.collection("betDataMap").where("settled", "!=", true);
  const response = await betRef.get();
  const data = response.docs.map((doc) => {
    const document = doc.data();
    document.id = doc.id;
    return document;
  });
  for (var i = 0; i < data.length; i++) {
    const url = `https://betfairoddsapi.com:3443/api/fancy_result/${data[i].matchId}/${data[i].fancyName}`;
    uri = encodeURI(url);
    uri = uri.replace("(", "%28");
    uri = uri.replace(")", "%29");
    const res = await axios.get(uri);
    if (res.data.result) {
      resolveBet(data[i].fancyName, res.data.result);
    }
  }
  console.log("Bet Resolved");
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
