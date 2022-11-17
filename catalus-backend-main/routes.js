const emailRoute = require("./Email");
const express = require("express");
const router = express.Router();

router.use("/sendmail", emailRoute);

module.exports = router;
