const CompilerController = require("../controllers/CompilerController");
const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/authenticate");

router.post("/submitCode", verifyUser, CompilerController.submitCode);
router.post("/run", verifyUser, CompilerController.run);
module.exports = router;
