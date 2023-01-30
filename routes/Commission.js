const CommissionController = require("../controllers/CommissionController");
const express = require("express");
const router = express.Router();


router.get("/getCompanyCommission/:username", CommissionController.companyShare);
router.post("/distribution", CommissionController.distributeCoin);

module.exports = router;

