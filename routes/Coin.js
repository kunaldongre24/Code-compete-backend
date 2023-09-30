const CoinController = require("../controllers/CoinController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get("/getTotalCoins/:username", CoinController.getTotalCoins);
router.get("/getDownBalance/:id", CoinController.getDownbalance);
router.get("/getUsedLimit/:userId", CoinController.getUsedLimit);
router.get("/getUserLimit/:username", verifyUser, CoinController.getUserLimit);
router.get("/getAgentLimit/:username", CoinController.getAgentLimit);
router.get("/deleteBetCoins/:id", CoinController.deleteBetCoins);
router.post("/limitControl", verifyUser, CoinController.limitControl);
module.exports = router;
