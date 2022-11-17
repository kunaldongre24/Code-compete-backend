const SubjectController = require("../controllers/SubjectController");
const express = require("express");
const router = express.Router();

router.get("/", SubjectController.getsubjectsByUserId);

router.get("/id/:id", SubjectController.getSubjectById);

module.exports = router;
