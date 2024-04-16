const RoomController = require("../controllers/RoomController");
const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/authenticate");

router.get("/check/:cid/:pid", RoomController.check);
router.get("/check2/:cid/:pid", RoomController.check2);
router.post("/createRoom", verifyUser, RoomController.createRoom);
router.get("/checkRoomExists", verifyUser, RoomController.checkRoomExists);
router.get("/getRoomInfo/:roomId", verifyUser, RoomController.getRoomInfo);
module.exports = router;
