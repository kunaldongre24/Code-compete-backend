const ProblemSetController = require("../controllers/ProblemSetController");
const express = require("express");
const { verifyUser } = require("../middleware/authenticate");
const router = express.Router();

router.get("/fetch2", ProblemSetController.fetchProblems2);
router.get("/countFolder", ProblemSetController.countAndUpdate);
router.get("/fetch3", ProblemSetController.fetchProblems3);
router.post(
  "/getRaceProblemset",
  verifyUser,
  ProblemSetController.getRaceProblemset
);
router.get("/uploadTags", ProblemSetController.uploadTags);
router.get("/getTags", ProblemSetController.getTags);
router.get("/deleteRating/:rating", ProblemSetController.deleteRating);
module.exports = router;
