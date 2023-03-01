const CoinController = require("../controllers/CoinController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth")


router.get("/getTotalCoins/:username", Auth, CoinController.getTotalCoins);

module.exports = router;

