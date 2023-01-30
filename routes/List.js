const ListController = require("../controllers/ListController");
const express = require("express");
const router = express.Router();

router.get("/sa/:username", ListController.getSaList);
router.get("/sp/:username", ListController.getSpList);
router.get("/ss/:username", ListController.getSsList);
router.get("/sc/:username", ListController.getScList);
router.get("/sst/:username", ListController.getSstList);
router.get("/all/:username", ListController.getAllList);


module.exports = router;
