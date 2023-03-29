const CoinController = require("../controllers/CoinController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth");

router.get("/getTotalCoins/:username", Auth, CoinController.getTotalCoins);
router.get("/getUserLimit/:username", Auth, CoinController.getUserLimit);
router.get("/getAgentLimit/:username", Auth, CoinController.getAgentLimit);
router.get("/deleteBetCoins/:id", CoinController.deleteBetCoins);
router.post("/limitControl", Auth, CoinController.limitControl);
module.exports = router;
