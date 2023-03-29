const LedgerController = require("../controllers/LedgerController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth");

router.get("/getTotalCash/:username", Auth, LedgerController.getUserCash);
router.get("/cashExpo/:username", Auth, LedgerController.cashExposure);
router.get("/getExpoLedger/:username", Auth, LedgerController.getExpoLedger);
router.post("/receiveCash", Auth, LedgerController.receiveCash);
router.post("/payCash", Auth, LedgerController.payCash);
module.exports = router;
