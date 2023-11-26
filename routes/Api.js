const ApiController = require("../controllers/ApiController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();
const checkAdmin = require("../middleware/checkAdmin");

router.post("/setMessage", verifyUser, checkAdmin, ApiController.setMessage);
router.get("/getMessage", ApiController.getMessage);
router.get("/getMatchList", ApiController.getMatchlist);
router.get("/getUserMatchList", verifyUser, ApiController.getUserMatchList);
router.get("/getTOdds/:matchId", ApiController.getTOdds);
// router.get("/getMatchOdds/:eventId", ApiController.getMatchOdds);

module.exports = router;
