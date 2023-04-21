const AuthController = require("../controllers/AuthController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth");

router.get("/getUser/:id", AuthController.getUserById);
router.get("/getUserByUsername/:username", AuthController.getUserByUsername);
router.get("/liveTime", Auth, AuthController.getLiveTime);
router.get("/getPlayerCount", AuthController.getPlayerCount);
router.get("/getAgentCount", Auth, AuthController.getAgentCount);
router.get("/getManagerCount", Auth, AuthController.getManagerCount);
router.get("/getStockistCount", Auth, AuthController.getStockistCount);
router.get("/getScCount", Auth, AuthController.getScCount);
router.get(
  "/getSuperStockistCount",
  Auth,
  AuthController.getSuperStockistCount
);
router.post("/signup", AuthController.signup);
router.post("/editUser", Auth, AuthController.UpdateUser);
// router.post("/createManager", Auth, AuthController.createManager);

module.exports = router;
