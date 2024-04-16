const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/authenticate");
const RaceController = require("../controllers/RaceController");

router.post("/createRace", verifyUser, RaceController.createRace);
router.post("/checkRaceStarted", verifyUser, RaceController.checkRaceStarted);
router.post("/getLeaderboard", verifyUser, RaceController.getLeaderboard);
router.post("/checkRole", verifyUser, RaceController.checkRole);
router.post("/spectate", verifyUser, RaceController.spectate);
router.get(
  "/getRacesByRoomId/:roomId",
  verifyUser,
  RaceController.getRacesByRoomId
);

module.exports = router;
