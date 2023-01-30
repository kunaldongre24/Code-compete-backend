const CoinController = require("../controllers/CoinController");
const express = require("express");
const router = express.Router();


router.get("/getTotalCoins/:username", CoinController.getTotalCoins);

module.exports = router;

