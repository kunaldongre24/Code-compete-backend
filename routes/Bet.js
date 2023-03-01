const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth");
const BetController = require("../controllers/BetController");


router.post("/placebet", Auth, BetController.placeBet);
router.post("/settleBet", Auth, BetController.settleBet);
router.get("/getMatchBets/:matchId", Auth, BetController.getBetsByMatchId);
router.get("/getAllbets", Auth, BetController.getAllBets);
router.get("/getUserBets/:matchId", Auth, BetController.getLiveBets);

module.exports = router;

