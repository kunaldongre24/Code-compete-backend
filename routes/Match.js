const MatchController = require("../controllers/MatchController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth");

router.get("/setMatchInfo/:matchId", Auth, MatchController.setMatchInfo);
router.get("/getLiveTime", Auth, MatchController.getLiveTime);
router.get("/getMatches/:userId", Auth, MatchController.getAllMatchList);
router.get("/getAllMatches", Auth, MatchController.getMatches);
router.get("/getSingleMatch/:matchId", Auth, MatchController.getSingleMatch);
router.get("/getMatchList/", Auth, MatchController.getMatchList);
router.get("/matchResult/:eventId", MatchController.matchResult);
router.get("/addData", MatchController.addData);
router.post("/fancyResult", MatchController.fancyResult);

module.exports = router;
