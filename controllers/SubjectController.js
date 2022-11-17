const db = require("../db");

const SubjectController = {
  getsubjectsByUserId(req, res) {
    const sql = `SELECT id,name FROM subjectCourseMap WHERE userId=${req.query.userId}`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      return res.send(result);
    });
  },
  getSubjectById(req, res) {
    const sql = `SELECT id, subjectId FROM subject WHERE id ='${req.params.id}'`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      return res.send(result);
    });
  },
};

module.exports = SubjectController;
