const express = require("express");
const router = express.Router();
const BetController = require("../controllers/BetController");
const { verifyUser } = require("../middleware/authenticate");

router.post("/placebet", verifyUser, BetController.placeBet);
router.post("/placeMatchBet", verifyUser, BetController.placeMatchBet);
router.post("/placeTossBet", verifyUser, BetController.placeTossBet);
router.post("/settleBet", BetController.settleBet);
router.get("/agentReport", BetController.agentReport);
router.post("/settleMatchBet", BetController.settleMatchBet);
router.post("/getCompanyReport", BetController.getCompanyReport);
// router.post("/settleTossBet", verifyUser, BetController.settleTossBet);
router.get(
  "/getMatchBets/:matchId",
  verifyUser,
  BetController.getBetsByMatchId
);
router.get(
  "/getBetPosition/:matchId",
  verifyUser,
  BetController.getMatchBetPosition
);
router.get(
  "/getDeclaredSession/:matchId",
  verifyUser,
  BetController.getDeclaredSession
);
// router.get("/getTossPosition/:matchId", verifyUser, BetController.getTossBetPosition);
router.get(
  "/getMyPlayerBets/:matchId",
  verifyUser,
  BetController.getBetUsingUserId
);
router.get("/getCompanyLenDen", verifyUser, BetController.getCompanyLenDen);
router.get(
  "/getCompanyReportById/:userId",
  verifyUser,
  BetController.getReportByUserId
);
router.get("/getUserAllBets/", verifyUser, BetController.getUserBets);
router.get(
  "/getAllMatchBets/:matchId",
  verifyUser,
  BetController.getMatchAllBets
);
router.get(
  "/getDetailedMatchBets/:matchId",
  verifyUser,
  BetController.getDetailedMatchBets
);
router.post("/deleteFancyBets", BetController.checkDeleteFancyResult);
router.post("/deleteMatchResult", BetController.checkDeleteMatchResult);
router.get("/deleteMatchBets/:marketId/:pwd", BetController.deleteMatchBet);
// router.get("/getAllTossBets", verifyUser, BetController.getAllTossBets);
router.get(
  "/getAllMatchTossBets/:matchId",
  verifyUser,
  BetController.getAllMatchTossBets
);
router.get("/getExposure/:username", verifyUser, BetController.getExposure);
router.get("/myAgentBets/:matchId", verifyUser, BetController.myAgentBets);
router.get(
  "/agentSessionEarning/:matchId",
  verifyUser,
  BetController.agentSessionEarning
);
router.get(
  "/myAgentCollection/:matchId",
  verifyUser,
  BetController.myAgentCollection
);
router.get(
  "/myPlayerCollection/:matchId",
  verifyUser,
  BetController.playerCollection
);
router.get("/myClientBets/:matchId", verifyUser, BetController.myPlayerBets);
router.get(
  "/myClientCollection/:matchId",
  verifyUser,
  BetController.myClientCollection
);
router.get("/getUserBets/:matchId", verifyUser, BetController.getLiveBets);
router.get(
  "/getMatchLedger/:matchId",
  verifyUser,
  BetController.getMatchLedger
);
// router.get("/getTossLedger/:matchId", verifyUser, BetController.getTossLedger);
// router.get("/getTossBets/:matchId", verifyUser, BetController.getTossBets);

module.exports = router;
