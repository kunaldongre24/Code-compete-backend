const ListController = require("../controllers/ListController");
const express = require("express");
const router = express.Router();
const Auth = require("../middleware/Auth")


router.get("/sa", Auth, ListController.getSaList);
router.get("/sp", Auth, ListController.getSpList);
router.get("/ss", Auth, ListController.getSsList);
router.get("/sc", Auth, ListController.getScList);
router.get("/ma", Auth, ListController.getMaList);
router.get("/sst", Auth, ListController.getSstList);
router.get("/all", Auth, ListController.getAllList);


module.exports = router;
