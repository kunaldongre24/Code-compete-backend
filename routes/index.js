const authRoute = require("./Auth");
const userRoute = require("./User");
const fileRoute = require("./File");
const express = require("express");
const router = express.Router();

router.use("/auth", authRoute);
router.use("/upload", fileRoute);
router.use("/user", userRoute);

module.exports = router;
