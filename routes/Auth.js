const AuthController = require("../controllers/AuthController");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const { verifyUser } = require("../middleware/authenticate");
const checkActiveSession = require("../middleware/checkActiveSession");

router.get("/getUser/:id", AuthController.getUserById);
router.get("/me", verifyUser, AuthController.getMyInfo);
router.get(
  "/getUserByUsername/:username",
  verifyUser,
  AuthController.getUserByUsername
);
router.get("/logout", verifyUser, AuthController.logout);
router.get("/getPlayerCount", verifyUser, AuthController.getPlayerCount);
router.get("/getAgentCount", verifyUser, AuthController.getAgentCount);
router.get("/getManagerCount", verifyUser, AuthController.getManagerCount);
router.get("/getStockistCount", verifyUser, AuthController.getStockistCount);
router.get("/getScCount", verifyUser, AuthController.getScCount);
router.get(
  "/getSuperStockistCount",
  verifyUser,
  AuthController.getSuperStockistCount
);
router.post("/refreshToken", AuthController.refreshToken);
router.post("/signup", verifyUser, AuthController.signup);
router.post(
  "/login",
  passport.authenticate("local"),
  checkActiveSession,
  AuthController.login
);
router.post("/editUser", verifyUser, AuthController.UpdateUser);
router.post("/createManager", verifyUser, AuthController.createManager);

module.exports = router;
