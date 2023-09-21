const ListController = require("../controllers/ListController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get("/sa", verifyUser, ListController.getSaList);
router.get("/sp", verifyUser, ListController.getSpList);
router.get("/ss", verifyUser, ListController.getSsList);
router.get("/sc", verifyUser, ListController.getScList);
router.get("/ma", verifyUser, ListController.getMaList);
router.get("/sst", verifyUser, ListController.getSstList);
router.get("/all", verifyUser, ListController.getAllList);

module.exports = router;
