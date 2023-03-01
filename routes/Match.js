const MatchController = require("../controllers/MatchController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth")

router.get("/setMatchInfo/:matchId", Auth, MatchController.setMatchInfo);
router.get("/getMatches", Auth, MatchController.getAllMatchList);
router.get("/getAllMatches", Auth, MatchController.getMatches);
router.get("/getSingleMatch/:matchId", Auth, MatchController.getSingleMatch);
router.get("/getMatchScore/:eventId", Auth, MatchController.getMatchScore);
router.get("/getMatchOdds/:eventId", Auth, MatchController.getMatchOdds);

module.exports = router;

