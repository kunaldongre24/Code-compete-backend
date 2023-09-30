const ApiController = require("../controllers/ApiController");
const express = require("express");
const router = express.Router();

// router.get("/getData/:eventId", ApiController.getData);
router.get("/getMatchList", ApiController.getMatchlist);
router.get("/getTOdds/:matchId", ApiController.getTOdds);
// router.get("/getMatchOdds/:eventId", ApiController.getMatchOdds);

module.exports = router;
