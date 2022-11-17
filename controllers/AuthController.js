const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const AuthController = {
  signup(req, res) {
    const user = req.body;
    const { username, email, password } = req.body;
    const userData = { email };
    if (!email || !username || !password) {
      return res.send({
        status: 0,
        err: "Input field cannot be empty",
      });
    } else {
      const checkUser = `SELECT * FROM user WHERE email=? or username=?`;
      db.query(checkUser, [email, username], async (err, result) => {
        try {
          if (err) return res.sendStatus(400);
          if (result[0] && result[0].email === email) {
            return res.send({
              status: 0,
              err: "An account already exists with this email or username",
            });
          } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            req.body.password = hashedPassword;
            const sql = `INSERT INTO user SET ?`;
            db.query(sql, user, (err, result) => {
              if (err) throw err;
              // Create token
              const token = jwt.sign(
                { user_id: result._id, email },
                "this is secret, change it when in production"
              );

              // save user token
              userData.id = result.id;
              userData.token = token;
              userData.status = 1;

              res.send(userData);
            });
          }
        } catch {
          return res.sendStatus(500).send();
        }
      });
    }
  },

  login(req, res) {
    const { email, password } = req.body;
    //checking if input field is not empty
    if (!email || !password) {
      return res.send({
        status: 0,
        err: "Input field cannot be empty",
      });
    } else {
      const sql = `SELECT * FROM user WHERE email=? or username=?`;
      db.query(sql, [email, email], (err, result) => {
        if (err) throw err;
        //checking if username exists
        if (!result[0]) {
          return res.send({
            status: 0,
            err: "The credentials don't match!",
          });
        } else {
          //comparing the password
          bcrypt.compare(password, result[0].password, function (err, value) {
            if (err) {
              throw err;
            }
            if (value) {
              const { id, email, username, name } = result[0];
              // Create token
              const token = jwt.sign(
                { id, email },
                "this is secret, change it when in production"
              );

              // save user token
              const userData = {
                id,
                email,
                username,
                name,
                token,
              };
              // user
              res.send(userData);
            } else {
              return res.send({
                status: 0,
                err: "Email or password is incorrect",
              });
            }
          });
        }
      });
    }
  },

  logout(req, res) {
    try {
      res.send({ message: "logged out successfully!" });
    } catch (err) {
      res.send(err);
    }
  },
};

module.exports = AuthController;
