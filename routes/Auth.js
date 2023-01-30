const AuthController = require("../controllers/AuthController");
const express = require("express");
const router = express.Router();


router.get("/getUser/:id", AuthController.getUserById);
router.get("/getUserByUsername/:username", AuthController.getUserByUsername);
router.get("/getPlayerCount", AuthController.getPlayerCount);
router.get("/getAgentCount", AuthController.getAgentCount);
router.get("/getStockistCount", AuthController.getStockistCount);
router.get("/getScCount", AuthController.getScCount);
router.get("/getSuperStockistCount", AuthController.getSuperStockistCount);
router.post("/signup", AuthController.signup);
router.delete("/deleteUser/:id", AuthController.deleteUser);

module.exports = router;
