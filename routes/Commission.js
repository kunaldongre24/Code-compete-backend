const CommissionController = require("../controllers/CommissionController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get(
  "/getCompanyCommission/:username",
  verifyUser,
  CommissionController.companyShare
);
router.post("/checkDistribution", CommissionController.checkDistribution);

router.post("/distribution", CommissionController.distributeCoin);

module.exports = router;
