const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth");
const BetController = require("../controllers/BetController");

router.post("/placebet", Auth, BetController.placeBet);
router.post("/placeMatchBet", Auth, BetController.placeMatchBet);
router.post("/settleBet", Auth, BetController.settleBet);
router.get("/getMatchBets/:matchId", Auth, BetController.getBetsByMatchId);
router.get("/getBetPosition/:matchId", Auth, BetController.getMatchBetPosition);
router.get("/getMyPlayerBets/:matchId", Auth, BetController.getMyPlayerBets);
router.get("/getUserAllBets/", Auth, BetController.getUserBets);
router.get("/getAllMatchBets/:matchId", Auth, BetController.getAllMatchBets);
router.get(
  "/getDetailedMatchBets/:matchId",
  Auth,
  BetController.getDetailedMatchBets
);
router.get("/getAllbets", Auth, BetController.getAllBets);
router.get("/getUserBets/:matchId", Auth, BetController.getLiveBets);

module.exports = router;
