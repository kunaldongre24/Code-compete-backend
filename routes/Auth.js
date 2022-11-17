const AuthController = require("../controllers/AuthController");
const auth = require("../middleware/Auth");
const express = require("express");
const router = express.Router();

router.post("/signup", AuthController.signup);

router.post("/login", AuthController.login);

router.get("/logout", auth, AuthController.logout);

module.exports = router;
