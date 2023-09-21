const MatchController = require("../controllers/MatchController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get("/setMatchInfo/:matchId", verifyUser, MatchController.setMatchInfo);
router.get("/getLiveTime", verifyUser, MatchController.getLiveTime);
router.get("/getMatches/:userId", verifyUser, MatchController.getAllMatchList);
router.get(
  "/getSingleMatch/:matchId",
  verifyUser,
  MatchController.getSingleMatch
);
router.get("/getMatchList/", verifyUser, MatchController.getMatchList);
router.get("/addData", MatchController.addData);

module.exports = router;
