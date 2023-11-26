require("dotenv").config();
const express = require("express");
const app = express();
const indexRouter = require("./routes/index");
const compression = require("compression");
const logger = require("morgan");
var cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const session = require("express-session");

const server = require("http").createServer(app);
const getMyPlayerBets = require("./helper/getMyPlayerBets");
const origin = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://fly247.in",
  "https://ma.fly247.in",
  "https://ng.fly247.in",
];
const BetController = require("./controllers/BetController");
const getMatchScore = require("./helper/getMatchScore");
const getMatchOdds = require("./helper/getMatchOdds");
require("./config/database.js");
require("./strategy/LocalStrategy");
require("./strategy/JWTStrategy");
require("./middleware/authenticate");

const io = require("socket.io")(server, {
  cors: { origin },
});

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);
  let intervalId;
  socket.on("getMatchOdds", (data) => {
    intervalId = setInterval(async () => {
      await getMatchOdds(data, socket);
    }, 1000);
  });
  socket.on("getMatchScore", (matchId) => {
    intervalId = setInterval(async () => {
      await getMatchScore(matchId, socket);
    }, 1000);
  });
  socket.on("getUnsettledMatch", () => {
    intervalId = setInterval(async () => {
      await BetController.fetchUnsettledMatches(socket);
    }, 1000);
  });
  socket.on("getAllBets", () => {
    intervalId = setInterval(async () => {
      await BetController.getAllBets(socket);
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
app.use(logger("dev"));
app.use(
  cors({
    origin,
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  })
);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Replace with your own secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "None",
      maxAge: 60000,
      domain: ".fly247.in",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.disable("etag");

// cron.schedule("*/30 * * * * *", () => {
//   console.log(`pages:${pages.size}`, pages.size > 0 ? [...pages.keys()] : "");
// });
// cron.schedule("0 */2 * * *", login);
app.use(compression());
app.use("/api/v1/", indexRouter);
app.use("/static", express.static("static"));

const port = 8000;
server.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
