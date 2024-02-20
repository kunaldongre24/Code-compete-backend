const authRoute = require("./Auth");
const roomRoute = require("./Room");
const raceRoute = require("./Race");
const problemSetRoute = require("./Problemset");
const compilerRoute = require("./Compiler");

const express = require("express");
const router = express.Router();

router.use("/auth", authRoute);
router.use("/compiler", compilerRoute);
router.use("/room", roomRoute);
router.use("/race", raceRoute);
router.use("/problemset", problemSetRoute);

module.exports = router;
