const authRoute = require("./Auth");
const listRoute = require("./List")
const coinRoute = require("./Coin")
const commissionRoute = require("./Commission")
const express = require("express");
const router = express.Router();

router.use("/auth", authRoute);
router.use("/list", listRoute);
router.use("/coin", coinRoute)
router.use("/commission", commissionRoute);

module.exports = router;
