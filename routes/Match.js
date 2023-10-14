const MatchController = require("../controllers/MatchController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get("/setMatchInfo/:matchId", verifyUser, MatchController.setMatchInfo);
router.get("/getLiveTime", verifyUser, MatchController.getLiveTime);
router.get(
  "/getMatches/:startDate/:endDate/:userId",
  MatchController.getAllMatchList
);
router.get("/getMatchList/", verifyUser, MatchController.getMatchList);
router.get("/addData", MatchController.addData);
router.get("/getMatchDetails/:matchId", MatchController.getSingleMatch);

module.exports = router;
