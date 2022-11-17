const UserController = require("../controllers/UserController");
const auth = require("../middleware/Auth");
const express = require("express");
const router = express.Router();

router.get("/", UserController.getAllUsers);

router.get("/id/:id", UserController.getUserFromUserId);

router.get("/search", auth, UserController.searchUser);

router.put("/u/:userId", auth, UserController.updateUser);

module.exports = router;
