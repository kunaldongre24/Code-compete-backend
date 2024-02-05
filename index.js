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
const {
  addUser,
  getUser,
  deleteUser,
  getUsers,
  updateStatus,
  handleMute,
  handleKickUser,
} = require("./helper/users.js");

const server = require("http").createServer(app);
const origin = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://fly247.in",
  "https://ma.fly247.in",
  "https://ng.fly247.in",
];
require("./config/database.js");
require("./strategy/LocalStrategy");
require("./strategy/JWTStrategy");
require("./middleware/authenticate");

const io = require("socket.io")(server, {
  cors: { origin },
});

io.on("connection", (socket) => {
  socket.on("login", async ({ userId, room }, callback) => {
    const { user, error } = await addUser(socket.id, userId, room);
    if (error) return callback(error);
    socket.join(user.roomId);
    socket.join(userId);
    socket.in(room).emit("notification", {
      title: "Someone's here",
      type: 1,
      description: `${user.userId.username} entered the room`,
    });
    const users = await getUsers(room);
    io.in(room).emit("users", users);
    callback();
  });
  socket.on("updateStatus", async (status) => {
    const users = await updateStatus(socket.id, status);
    io.in(users[0].roomId).emit("users", users);
  });
  socket.on("handleMute", async ({ userId, status }) => {
    const user = await handleMute(userId, status);
    if (user) {
      io.in(userId).emit("notification", {
        type: !status,
        description: `You have been ${status ? "muted" : "unmuted"}!`,
      });
      const users = await getUsers(user.roomId);
      io.in(users[0].roomId).emit("users", users);
    }
  });
  socket.on("kickUser", async (userId) => {
    const user = await handleKickUser(userId);
    if (user) {
      io.in(user.roomId).emit("notification", {
        type: 0,
        description: `${user.userId.username} has been kicked!`,
      });
      const users = await getUsers(user.roomId);
      io.in(users[0].roomId).emit("users", users);
    }
  });
  socket.on("sendMessage", async (message) => {
    const user = await getUser(socket.id);
    io.in(user.roomId).emit("message", {
      user: user.userId.username,
      text: message,
    });
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
