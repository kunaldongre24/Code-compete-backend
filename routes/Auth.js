const AuthController = require("../controllers/AuthController");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const { verifyUser } = require("../middleware/authenticate");
const checkAdmin = require("../middleware/checkAdmin");
const checkPlayer = require("../middleware/checkPlayer");
const checkManager = require("../middleware/checkManager");

router.get("/getUser/:id", AuthController.getUserById);
router.get("/me", verifyUser, AuthController.getMyInfo);
router.get(
  "/getUserByUsername/:username",
  verifyUser,
  AuthController.getUserByUsername
);
router.get("/adminLogout", verifyUser, AuthController.adminLogout);
router.get("/userLogout", verifyUser, AuthController.userLogout);
router.get("/managerLogout", verifyUser, AuthController.managerLogout);
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
router.post("/changePassword", verifyUser, AuthController.changePassword);
router.post("/editPassword", verifyUser, AuthController.editPassword);
router.post("/checkAdminActive", AuthController.checkAdminActive);
router.post("/checkUserActive", AuthController.checkUserActive);
router.post("/checkManagerActive", AuthController.checkManagerActive);
router.post("/signup", verifyUser, AuthController.signup);
router.post(
  "/authLogin",
  passport.authenticate("local"),
  checkAdmin,
  AuthController.authLogin
);
router.post(
  "/userLogin",
  passport.authenticate("local"),
  checkPlayer,
  AuthController.userLogin
);
router.post(
  "/managerLogin",
  passport.authenticate("local"),
  checkManager,
  AuthController.managerLogin
);
router.post("/editUser", verifyUser, AuthController.UpdateUser);
router.post("/createManager", verifyUser, AuthController.createManager);

module.exports = router;
