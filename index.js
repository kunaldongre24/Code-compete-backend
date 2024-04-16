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
const jwt = require("jsonwebtoken");
const {
  addUser,
  getUser,
  deleteUser,
  getUsers,
  updateStatus,
  handleMute,
  handleKickUser,
  updateSpectate,
  getUserById,
} = require("./helper/users.js");
const {
  updateRounds,
  updateMinRating,
  updateMaxRating,
} = require("./helper/rooms.js");
const {
  updateRaceUserProblemsetMap,
  findRaceUserProblemsetMap,
} = require("./helper/race.js");
const Race = require("./models/Race.js");
const ResolveInternalRaces = require("./utils/ResolveIntervalRaces");
const server = require("http").createServer(app);
const origin = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://iccp-live.web.app",
];
require("./config/database.js");
require("./strategy/LocalStrategy");
require("./strategy/JWTStrategy");
require("./middleware/authenticate");

const io = require("socket.io")(server, {
  cors: { origin },
});
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      console.error(err);
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.userId = decoded._id;
    next();
  });
});

io.on("connection", (socket) => {
  socket.on("login", async ({ userId, room }, callback) => {
    const { user, error } = await addUser(socket.id, userId, room);
    if (error) return callback && callback(error); // Check if callback is defined
    if (user) {
      socket.roomId = room;
      socket.join(user.roomId.toString());
      socket.join(userId);
      io.in(user.roomId.toString()).emit("notification", {
        type: 1,
        description: `${user.userId.username} entered the room`,
      });
      const users = await getUsers(user.roomId);
      io.in(user.roomId.toString()).emit("users", users);
    }
    if (callback) callback(); // Check if callback is defined
  });
  socket.on("ping", () => {
    io.emit("pong");
  });
  socket.on("setInRace", async ({ id }, callback) => {
    const race = await Race.findOne({ _id: id });
    if (!race) {
      return callback("Not found!");
    }
    socket.join(id.toString());
  });
  socket.on("spectateUser", async ({ id, raceId }, callback) => {
    const user = await getUserById(socket.userId);
    if (!(user && user.isSpectator)) {
      return callback("Not allowed!");
    }
    socket.join("spectate" + id);
    const raceUserProblemsetMap = await findRaceUserProblemsetMap(id, raceId);
    const code = raceUserProblemsetMap
      ? raceUserProblemsetMap.code
      : "#include<iostream>\nusing namespace std;\nint main(){\n\n\treturn 0;\n}";
    io.in("spectate" + socket.userId).emit("setSpectateUser", {
      userId: socket.userId,
      code,
    });
  });
  socket.on("leaveSpectate", (id) => {
    socket.leave("spectate" + id);
  });
  socket.on("updateCode", (x) => {
    const { code, raceId, problemId } = x;
    updateRaceUserProblemsetMap(code, socket.userId, raceId, problemId);
    io.in("spectate" + socket.userId).emit("setSpectateUser", {
      userId: socket.userId,
      code,
    });
  });
  socket.on("updatePos", (x) => {
    const { code, pos, raceId, problemId } = x;
    updateRaceUserProblemsetMap(code, pos, socket.userId, raceId, problemId);
    io.in("spectate" + socket.userId).emit("setSpectateUser", {
      userId: socket.userId,
      code,
      pos,
    });
  });
  socket.on("updateStatus", async (status, callback) => {
    const users = await updateStatus(socket.id, status);
    io.in(users[0].roomId.toString()).emit("users", users);
    callback();
  });
  socket.on("updateSpectate", async (status, callback) => {
    const users = await updateSpectate(socket.id, status);
    io.in(users[0].roomId.toString()).emit("notification", {
      type: 2,
      description: `${
        users.filter((x) => x.socketId === socket.id)[0].userId.username
      } ${status ? "is now spectating." : "has joined the race."}`,
    });
    io.in(users[0].roomId.toString()).emit("users", users);
    callback();
  });
  socket.on("handleMute", async ({ userId, status }) => {
    const user = await handleMute(userId, status, socket.userId);
    if (user) {
      const users = await getUsers(user.roomId);
      io.in(user.roomId.toString()).emit("users", users);
      io.in(userId).emit("notification", {
        type: !status,
        description: `You have been ${status ? "muted" : "unmuted"}!`,
      });
    }
  });

  socket.on("kickUser", async (userId) => {
    const user = await handleKickUser(userId, socket.userId);
    if (user) {
      io.in(user.roomId.toString()).emit("notification", {
        type: 0,
        description: `${user.userId.username} has been kicked!`,
      });
      const users = await getUsers(user.roomId);
      io.in(users[0].roomId.toString()).emit("users", users);
    }
  });

  socket.on("updateMinRating", async ({ val, roomId }, callback) => {
    const room = await updateMinRating(roomId, val, socket.userId);
    io.in(room._id.toString()).emit("room", room);
    io.in(room._id.toString()).emit("notification", {
      type: 2,
      description: `Min Rating changed to ${val}.`,
    });
    callback();
  });
  socket.on("updateMaxRating", async ({ val, roomId }, callback) => {
    const room = await updateMaxRating(roomId, val, socket.userId);
    io.in(room._id.toString()).emit("room", room);
    io.in(room._id.toString()).emit("notification", {
      type: 2,
      description: `Max Rating changed to ${val}.`,
    });
    callback();
  });
  socket.on("sendMessage", async (message, callback) => {
    const user = await getUser(socket.id);
    io.in(user.roomId.toString()).emit("message", {
      user: user.userId.username,
      text: message,
    });
    callback();
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected");
    const user = await deleteUser(socket.id);
    if (user) {
      io.in(user.roomId.toString()).emit("notification", {
        type: 0,
        description: `${user.userId.username} left the room`,
      });
      const users = await getUsers(user.roomId);
      io.in(user.roomId.toString()).emit("users", users);
    }
  });
});

app.set("socket", io);
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
    },
  })
);
ResolveInternalRaces(io);
app.use(passport.initialize());
app.use(passport.session());
app.disable("etag");

app.use(compression());
app.use("/api/v1/", indexRouter);
app.use("/static", express.static("static"));

const port = 8000;
server.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
