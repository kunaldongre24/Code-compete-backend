const ProblemSetController = require("../controllers/ProblemSetController");
const express = require("express");
const router = express.Router();

router.get("/fetch", ProblemSetController.fetchProblems);
router.get("/getProblem", ProblemSetController.getProblem);
router.get("/deleteRating/:rating", ProblemSetController.deleteRating);
module.exports = router;
