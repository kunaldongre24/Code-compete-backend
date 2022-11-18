const db = require("../db");
const fetch = require("node-fetch");
// const bcrypt = require("bcrypt");

const UserController = {
  async getAllUsers(req, res) {
    fetch("https://api.publicapis.org/entries")
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        res.send(data);
      })
      .catch((err) => console.log(err));
    // const response = await axios.get("https://api.publicapis.org/entries");
    // const json = response.data;
    // console.log(response);
    // res.send(json);
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
  async updateUser(req, res) {},
};

module.exports = UserController;
