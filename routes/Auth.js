const AuthController = require("../controllers/AuthController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth")


router.get("/getUser/:id", Auth, AuthController.getUserById);
router.get("/getUserByUsername/:username", Auth, AuthController.getUserByUsername);
router.get("/getPlayerCount", Auth, AuthController.getPlayerCount);
router.get("/getAgentCount", Auth, AuthController.getAgentCount);
router.get("/getManagerCount", Auth, AuthController.getManagerCount);
router.get("/getStockistCount", Auth, AuthController.getStockistCount);
router.get("/getScCount", Auth, AuthController.getScCount);
router.get("/getSuperStockistCount", Auth, AuthController.getSuperStockistCount);
router.post("/signup", Auth, AuthController.signup);
router.post("/createManager", Auth, AuthController.createManager);
router.delete("/deleteUser/:id", Auth, AuthController.deleteUser);

module.exports = router;
