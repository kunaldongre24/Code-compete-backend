const authRoute = require("./Auth");
const listRoute = require("./List")
const coinRoute = require("./Coin")
const matchRoute = require("./Match")
const commissionRoute = require("./Commission")
const betRoute = require("./Bet")
const express = require("express");
const router = express.Router();

router.use("/auth", authRoute);
router.use("/list", listRoute);
router.use("/coin", coinRoute)
router.use("/commission", commissionRoute);
router.use("/sports", matchRoute);
router.use("/bet", betRoute);

module.exports = router;
