const db = require("../db");
const fs = require("fs");

const FileController = {
  uploadFile(req, res) {
    if (req.file) {
      return res.send({ path: req.file.path });
    }
  },
};
module.exports = FileController;
