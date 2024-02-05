const RoomController = require("../controllers/RoomController");
const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/authenticate");

router.post("/createRoom", verifyUser, RoomController.createRoom);
router.post(
  "/removeUserFromRoom",
  verifyUser,
  RoomController.handleRemoveUserFromRoom
);
router.get("/getRoomInfo/:roomId", verifyUser, RoomController.getRoomInfo);
module.exports = router;
