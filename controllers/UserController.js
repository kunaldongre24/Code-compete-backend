const db = require("../db");
const bcrypt = require("bcrypt");

const UserController = {
  getAllUsers(req, res) {
    axios
      .get(
        "http://142.93.36.1/api/v1/fetch_data?Action=listCompetitions&EventTypeID=1"
      )
      .then(function (response) {
        // handle success
        console.log(response);
        res.send({ res: response });
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  },

  getUserFromUserId(req, res) {
    const sql = `SELECT id,name,username,email,profile_img_url FROM user WHERE id ='${req.params.id}'`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      return res.send(result);
    });
  },

  searchUser(req, res) {
    const q = req.query.s;
    const sql = `SELECT id,name,username,profile_img_url FROM user WHERE (name LIKE '%${q}%' OR id LIKE '${q}%' OR email LIKE '${q}%' OR username LIKE '${q}%' ) order by case 
    when name LIKE '${q}%' then 1 
    when name LIKE '%${q}' then 2
    else 3
end;`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      return res.send(result);
    });
  },
  async updateUser(req, res) {
    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      req.body.password = hashedPassword;
    }
    const user = req.body;
    const sql = `UPDATE user SET ? WHERE id = '${req.params.userId}'`;
    db.query(sql, user, (err, result) => {
      if (err) throw err;
      return res.send(result);
    });
  },
};

module.exports = UserController;
