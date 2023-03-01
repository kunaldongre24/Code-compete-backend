const CommissionController = require("../controllers/CommissionController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth")



router.get("/getCompanyCommission/:username", Auth, CommissionController.companyShare);
router.post("/distribution", CommissionController.distributeCoin);

module.exports = router;

