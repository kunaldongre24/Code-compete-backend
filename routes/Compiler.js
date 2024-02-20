const CompilerController = require("../controllers/CompilerController");
const express = require("express");
const router = express.Router();

router.post("/submitCode", CompilerController.submitCode);
router.post("/run", CompilerController.run);
module.exports = router;
