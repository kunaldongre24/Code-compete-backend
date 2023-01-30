require("dotenv").config();
const express = require("express");
const app = express();
const createError = require("http-errors");
const indexRouter = require("./routes/index");
const compression = require("compression");
const logger = require("morgan");
const db = require("./db");
var cors = require("cors");

const { PORT } = process.env;

app.disable("etag");

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  })
); // Use this after the variable declaration

app.use("/static", express.static("static"));
app.use(compression());
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/v1/", indexRouter);
// catch 404 and forward to error handler

const port = PORT || 8000;
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
