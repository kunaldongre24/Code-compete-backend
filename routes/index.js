const authRoute = require("./Auth");
const roomRoute = require("./Room");

const express = require("express");
const router = express.Router();

router.use("/auth", authRoute);
router.use("/room", roomRoute);

module.exports = router;
