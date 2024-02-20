const RoomController = require("../controllers/RoomController");
const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/authenticate");

router.get("/check/:cid/:pid", RoomController.check);
router.get("/check2/:cid/:pid", RoomController.check2);
router.post("/createRoom", verifyUser, RoomController.createRoom);
router.post("/sendMessage", verifyUser, RoomController.handleSendMessage);
router.post("/updateStatus", verifyUser, RoomController.handleUpdateStatus);
router.post("/updateSpectate", verifyUser, RoomController.handleUpdateSpectate);
router.post("/kickUser", verifyUser, RoomController.kickUser);
router.post("/muteUser", verifyUser, RoomController.muteUser);
router.post("/updateTpp", verifyUser, RoomController.updateTpp);
router.post("/updateRounds", verifyUser, RoomController.updateRounds);
router.post("/updateMinRating", verifyUser, RoomController.updateMinRating);
router.post("/updateMaxRating", verifyUser, RoomController.updateMaxRating);
router.get("/getRoomInfo/:roomId", verifyUser, RoomController.getRoomInfo);
module.exports = router;
