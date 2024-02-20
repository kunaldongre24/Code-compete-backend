const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/authenticate");
const RaceController = require("../controllers/RaceController");

router.post("/createRace", verifyUser, RaceController.createRace);
router.post("/checkRaceStarted", verifyUser, RaceController.checkRaceStarted);

module.exports = router;
