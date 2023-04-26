require("dotenv").config();
const express = require("express");
const app = express();
const indexRouter = require("./routes/index");
const compression = require("compression");
const logger = require("morgan");
var cors = require("cors");
const cron = require("node-cron");
const server = require("http").createServer(app);
const ResolveResult = require("./helper/ResolveResult");
const getMatchOdds = require("./helper/getMatchOdds");
const getMatchScore = require("./helper/getMatchScore");
const getMyPlayerBets = require("./helper/getMyPlayerBets");
const origin = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://fly247.in",
  "https://ma.fly247.in",
  "https://ng.fly247.in",
];
const { PORT } = require("./config/config.js");
require("./config/database.js");

const io = require("socket.io")(server, {
  cors: { origin },
});

io.on("connection", (socket) => {
  console.log("Client connected");
  let intervalId;
  socket.on("getMatchOdds", (matchId) => {
    intervalId = setInterval(async () => {
      await getMatchOdds(matchId, socket);
    }, 1000);
  });
  socket.on("getMatchScore", (matchId) => {
    intervalId = setInterval(async () => {
      await getMatchScore(matchId, socket);
    }, 1000);
  });
  socket.on("getMyPlayerBets", (data) => {
    intervalId = setInterval(async () => {
      await getMyPlayerBets(data, socket);
    }, 1000);
  });
  socket.on("disconnect", () => {
    console.log("Client Disconnected", socket.id);
    clearInterval(intervalId);
  });
});

app.disable("etag");

app.use(
  cors({
    origin,
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  })
);

cron.schedule("*/30 * * * * *", ResolveResult);
app.use("/static", express.static("static"));
app.use(compression());
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/v1/", indexRouter);
// catch 404 and forward to erro  r handler

const port = PORT || 8000;
server.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
