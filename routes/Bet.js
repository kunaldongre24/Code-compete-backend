const express = require("express");
const router = express.Router();
const BetController = require("../controllers/BetController");
const { verifyUser } = require("../middleware/authenticate");
const checkManager = require("../middleware/checkManager");
const checkPlayer = require("../middleware/checkPlayer");
const checkAdmin = require("../middleware/checkAdmin");

router.post("/placebet", verifyUser, checkPlayer, BetController.placeBet);
router.post(
  "/placeMatchBet",
  verifyUser,
  checkPlayer,
  BetController.placeMatchBet
);
router.post("/placeTossBet", verifyUser, BetController.placeTossBet);
router.post("/settleBet", verifyUser, checkManager, BetController.settleBet);
router.get("/agentReport", BetController.agentReport);
router.post(
  "/settleMatchBet",
  verifyUser,
  checkManager,
  BetController.settleMatchBet
);
router.post("/getCompanyReport", verifyUser, BetController.getCompanyReport);
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
  checkAdmin,
  BetController.getDeclaredSession
);
// router.get("/getTossPosition/:matchId", verifyUser, BetController.getTossBetPosition);
router.get(
  "/getMyPlayerBets/:matchId",
  verifyUser,
  checkAdmin,
  BetController.getBetUsingUserId
);
router.get(
  "/getCompanyLenDen/:startDate/:endDate",
  verifyUser,
  BetController.getCompanyLenDen
);
router.get(
  "/getCompanyReportById/:userId",
  // verifyUser,
  // checkAdmin,
  BetController.getReportByUserId
);
router.get("/getUserAllBets/", verifyUser, BetController.getUserBets);
router.get("/getLedgerList/:userId", BetController.getLedgerList);
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
  BetController.getCollectionReport
);
router.get(
  "/myPlayerCollection/:matchId",
  verifyUser,
  checkAdmin,
  BetController.playerCollection
);
router.get("/myClientBets/:matchId", verifyUser, BetController.myPlayerBets);
router.get(
  "/myClientCollection/:matchId",
  verifyUser,
  checkAdmin,
  BetController.myClientCollection
);
router.get("/getAllCompanyExpo/:userId", BetController.getAllCompanyExpo);
router.get("/getUserBets/:matchId", verifyUser, BetController.getLiveBets);
router.get(
  "/getMatchLedger/:matchId",
  verifyUser,
  BetController.getMatchLedger
);
// router.get("/getTossLedger/:matchId", verifyUser, BetController.getTossLedger);
// router.get("/getTossBets/:matchId", verifyUser, BetController.getTossBets);

module.exports = router;
