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
} = require("./helper/users.js");
const {
  updateTpp,
  updateRounds,
  updateMinRating,
  updateMaxRating,
} = require("./helper/rooms.js");
const Room = require("./models/Room.js");

const server = require("http").createServer(app);
const origin = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
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
      console.log(err);
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.userId = decoded._id;
    const room = await Room.findOne({ admin: decoded._id }); // Assuming you have a Room model
    if (room) {
      socket.adminRoom = room.roomId;
    }
    next();
  });
});

io.on("connection", (socket) => {
  socket.on("login", async ({ userId, room }, callback) => {
    const { user, error } = await addUser(socket.id, userId, room);
    if (error) return callback(error);
    if (user) {
      socket.roomId = room;
      socket.join(user.roomId);
      socket.join(userId);
      socket.in(room).emit("notification", {
        type: 1,
        description: `${user.userId.username} entered the room`,
      });
    }
    const users = await getUsers(room);
    io.in(room).emit("users", users);
    callback();
  });
  socket.on("updateStatus", async (status, callback) => {
    const users = await updateStatus(socket.id, status);
    io.in(users[0].roomId).emit("users", users);
    callback();
  });
  socket.on("updateSpectate", async (status, callback) => {
    const users = await updateSpectate(socket.id, status);
    io.in(users[0].roomId).emit("notification", {
      type: 2,
      description: `${
        users.filter((x) => x.socketId === socket.id)[0].userId.username
      } ${status ? "is now spectating." : "has joined the race."}`,
    });
    io.in(users[0].roomId).emit("users", users);
    callback();
  });
  socket.on("handleMute", async ({ userId, status }) => {
    if (socket.adminRoom && socket.adminRoom === socket.roomId) {
      const user = await handleMute(userId, status);
      if (user) {
        io.in(userId).emit("notification", {
          type: !status,
          description: `You have been ${status ? "muted" : "unmuted"}!`,
        });
        const users = await getUsers(user.roomId);
        io.in(users[0].roomId).emit("users", users);
      }
    }
  });

  socket.on("kickUser", async (userId) => {
    if (socket.adminRoom && socket.adminRoom === socket.roomId) {
      const user = await handleKickUser(userId);
      if (user) {
        io.in(user.roomId).emit("notification", {
          type: 0,
          description: `${user.userId.username} has been kicked!`,
        });
        const users = await getUsers(user.roomId);
        io.in(users[0].roomId).emit("users", users);
      }
    }
  });

  socket.on("updateTpp", async ({ val, roomId }, callback) => {
    if (socket.adminRoom && socket.adminRoom === socket.roomId) {
      const room = await updateTpp(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `Tpp changed to ${val}.`,
      });
    }
    callback();
  });
  socket.on("updateRounds", async ({ val, roomId }, callback) => {
    if (socket.adminRoom && socket.adminRoom === socket.roomId) {
      const room = await updateRounds(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `No. of rounds changed to ${val}.`,
      });
    }
    callback();
  });
  socket.on("updateMinRating", async ({ val, roomId }, callback) => {
    if (socket.adminRoom && socket.adminRoom === socket.roomId) {
      const room = await updateMinRating(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `Min Rating changed to ${val}.`,
      });
    }
    callback();
  });
  socket.on("updateMaxRating", async ({ val, roomId }, callback) => {
    if (socket.adminRoom && socket.adminRoom === socket.roomId) {
      const room = await updateMaxRating(roomId, val);
      io.in(room.roomId).emit("room", room);
      io.in(room.roomId).emit("notification", {
        type: 2,
        description: `Max Rating changed to ${val}.`,
      });
    }
    callback();
  });
  socket.on("sendMessage", async (message, callback) => {
    const user = await getUser(socket.id);
    io.in(user.roomId).emit("message", {
      user: user.userId.username,
      text: message,
    });
    callback();
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected");
    const user = await deleteUser(socket.id);
    if (user) {
      io.in(user.roomId).emit("notification", {
        type: 0,
        description: `${user.userId.username} left the room`,
      });
      const users = await getUsers(user.roomId);
      io.in(user.roomId).emit("users", users);
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
      httpOnly: true,
      sameSite: "None",
      maxAge: 60000,
    },
  })
);

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
