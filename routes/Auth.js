const AuthController = require("../controllers/AuthController");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const { verifyUser } = require("../middleware/authenticate");
const checkAdmin = require("../middleware/checkAdmin");
const checkUser = require("../middleware/checkUser");

router.get("/getUser/:id", AuthController.getUserById);
router.get("/me", verifyUser, AuthController.getMyInfo);
router.get(
  "/getUserByUsername/:username",
  verifyUser,
  AuthController.getUserByUsername
);
router.get("/adminLogout", verifyUser, AuthController.adminLogout);
router.get("/userLogout", verifyUser, AuthController.userLogout);
router.get("/verified", AuthController.verified);
router.get("/verify/:userId/:uniqueString", AuthController.verifyEmail);
router.post("/changePassword", verifyUser, AuthController.changePassword);
router.post("/editPassword", verifyUser, AuthController.editPassword);
router.post("/checkAdminActive", AuthController.checkAdminActive);
router.post("/checkUserActive", AuthController.checkUserActive);
router.post("/signup", AuthController.signup);
router.post("/adminSignup", AuthController.adminSignup);
router.post(
  "/authLogin",
  passport.authenticate("local"),
  checkAdmin,
  AuthController.authLogin
);
router.post(
  "/userLogin",
  passport.authenticate("local"),
  checkUser,
  AuthController.userLogin
);
router.post("/editUser", verifyUser, AuthController.UpdateUser);

module.exports = router;
