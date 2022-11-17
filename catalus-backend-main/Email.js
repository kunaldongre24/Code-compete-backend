const EmailController = require("./EmailController");
const express = require("express");
const router = express.Router();

router.post("/user", EmailController.sendUserEmail);

router.post("/admin", EmailController.sendAdminEmail);

module.exports = router;
