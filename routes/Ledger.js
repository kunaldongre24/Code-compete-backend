const LedgerController = require("../controllers/LedgerController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get("/getTotalCash/:username", verifyUser, LedgerController.getUserCash);
router.get("/cashExpo/:username", verifyUser, LedgerController.cashExposure);
router.get(
  "/getCashLedger/:userId/:startDate/:endDate",
  LedgerController.getCashLedger
);
router.get(
  "/getLedger/:userId/:startDate/:endDate",
  LedgerController.ledgerShow
);
router.get(
  "/getMatchLedger/:userId/:startDate/:endDate",
  LedgerController.getMatchLedger
);
router.get("/getExpoLedger/:username", LedgerController.getExpoLedger);
router.post("/receiveCash", verifyUser, LedgerController.receiveCash);
router.post("/payCash", verifyUser, LedgerController.payCash);
module.exports = router;
