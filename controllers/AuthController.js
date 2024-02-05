const User = require("../models/User");

const {
  COOKIE_OPTIONS,
  getRefreshToken,
} = require("../middleware/authenticate");
const jwt = require("jsonwebtoken");
const isTokenExpired = require("../helper/isTokenExpired");
const { ObjectId } = require("mongodb");
const isValidPassword = require("../helper/isValidPassword");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const UserOTPVerification = require("../models/UserOTPVerification");
const bcrypt = require("bcrypt");
const path = require("path");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error(error);
  } else {
    console.log("Ready for messages");
  }
});

const AuthController = {
  async getMyInfo(req, res) {
    try {
      const user = await User.findById(req.user._id).select({
        username: 1,
        name: 1,
        rating: 1,
        createdOn: 1,
        role: 1,
        _id: 1,
      });
      res.send(user);
    } catch (err) {
      console.error(err);
      res.send({ msg: "Internal server error" });
    }
  },

  async getUserBy_id(_id) {
    const user = await User.findById(_id);
    return user;
  },
  async getUserById(req, res) {
    const { id } = req.params;
    const response = await AuthController.getUserBy_id(id);
    res.send(response);
  },
  async getUserInformation(username) {
    const user = await User.findOne({ username: username });
    if (user) {
      return user;
    }
    return;
  },
  async getUserByUsername(req, res) {
    const { username } = req.params;
    const info = await AuthController.getUserInformation(
      username.toLowerCase()
    );
    res.send(info);
  },
  // async deleteUser(req, res) {
  //   const collectionRef = db.collection("users");
  //   const query = collectionRef.where("username", "!=", "cc0001");
  //   query.get().then((querySnapshot) => {
  //     querySnapshot.forEach(async (doc) => {
  //       doc.ref.delete();
  //       await fs.auth().deleteUser(doc.id);
  //     });
  //   });
  //   res.send({ msg: "Users deleted" });
  // },

  async UpdateUser(req, res) {
    const { name, _id } = req.body;
    if (name === undefined) {
      return res.send({ err: "Missing Information" });
    }
    if (name.length > 20) {
      return res.send({
        userCreated: false,
        msg: "Name cannot be more than 20 characters",
      });
    }
    const userDetails = await AuthController.getUserBy_id(new ObjectId(_id));
    if (userDetails.companyId !== req.user.username) {
      res.send({ userUpdated: false, msg: "Insufficient Permissions!" });
    }
    try {
      const user = await User.findOneAndUpdate(
        { _id: new ObjectId(_id) },
        { name: name },
        { new: true }
      );
      if (!user) {
        return res
          .status(404)
          .send({ userCreated: false, msg: "User not found" });
      }
      return res.send({
        userUpdated: true,
        msg: "User has been updated successfully",
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send({ userCreated: false, msg: "Internal server error" });
    }
  },
  isBlank(num) {
    return num === null || num === undefined || isNaN(num) || num < 0;
  },
  async signup(req, res) {
    try {
      var { password, name, username, email } = req.body;
      if (name.trim() === "") {
        return res.send({ userCreated: false, msg: "Name cannot be empty" });
      }
      if (!isValidPassword(password)) {
        return res.json({
          userCreated: false,
          msg: "Password should be greater than 6 characters",
        });
      }
      if (name.length > 20) {
        return res.send({
          userCreated: false,
          msg: "Name cannot be more than 20 characters",
        });
      }
      if (username.length > 20 || username.length < 4) {
        return res.send({
          userCreated: false,
          msg: "Username cannot be more than 20 characters",
        });
      }
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        // Handle invalid characters in the username
        res.status(400).json({ error: "Invalid characters in the username" });
        return;
      }
      const newUser = await User.find({ username });
      if (newUser.length) {
        return res.send({ userCreated: false, msg: "Username already taken!" });
      }

      User.register(
        new User({
          username,
          name,
          email,
          role: "user",
          createdOn: Date.now(),
        }),
        password,
        async (err, user) => {
          if (err) {
            res.statusCode = 500;
            console.error(err);
            return res.send({
              userCreated: false,
              msg: "Internal server error",
            });
          } else {
            AuthController.sendOtpVerificationEmail(user, res);
          }
        }
      );
    } catch (error) {
      console.error(error);
      res.send({ userCreated: false, msg: "Some error occurred" });
      return;
    }
  },
  async adminSignup(req, res) {
    try {
      var { password, name, username } = req.body;
      if (name.trim() === "") {
        return res.send({ userCreated: false, msg: "Name cannot be empty" });
      }
      if (!isValidPassword(password)) {
        return res.json({
          userCreated: false,
          msg: "Invalid Password Length.",
        });
      }
      if (name.length > 20) {
        return res.send({
          userCreated: false,
          msg: "Name cannot be more than 20 characters",
        });
      }
      if (username.length > 20) {
        return res.send({
          userCreated: false,
          msg: "Username cannot be more than 20 characters",
        });
      }
      const newUser = await User.find({ username });
      if (newUser.length) {
        return res.send({ userCreated: false, msg: "Username already taken!" });
      }

      User.register(
        new User({
          username,
          name,
          email,
          role: "admin",
          createdOn: Date.now(),
        }),
        password,
        async (err, user) => {
          if (err) {
            res.statusCode = 500;
            console.error(err);
            return res.send({ userCreated: false, msg: "Err" });
          } else {
            return res.send({
              userCreated: true,
              msg: "User has been created Successfully",
            });
          }
        }
      );
    } catch (error) {
      console.error(error);
      res.send({ userCreated: false, msg: "Some error occurred" });
      return;
    }
  },
  async editPassword(req, res, next) {
    try {
      const { newPassword, username } = req.body;
      if (!username || !newPassword) {
        return res
          .status(400)
          .json({ status: false, msg: "Missing Information." });
      }
      // Check if the new password meets your criteria (e.g., minimum length)
      if (!isValidPassword(newPassword)) {
        return res
          .status(400)
          .json({ status: false, msg: "Invalid Password Length." });
      }

      // Find the user by ID and update the password
      const user = await AuthController.getUserInformation(username);
      if (!user) {
        return res
          .status(400)
          .json({ status: false, msg: "Invalid Username." });
      }
      if (user.companyId !== req.user.username) {
        return res
          .status(400)
          .json({ status: false, msg: "Insufficient Permission." });
      }
      user.setPassword(newPassword, async () => {
        await user.save();
        res
          .status(200)
          .json({ status: true, msg: "Password updated successfully." });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, msg: "Internal server error." });
    }
  },
  async authLogin(req, res, next) {
    try {
      const token = getRefreshToken({
        _id: req.user._id,
        username: req.user.username,
      });
      const refreshToken = getRefreshToken({ _id: req.user._id });

      const user = await User.findById(req.user._id);
      user.currentSession = refreshToken; // Set the current session
      user.refreshToken.push({ refreshToken });
      await user.save();

      res.cookie("jsession", refreshToken, COOKIE_OPTIONS);
      res.status(200).json({ success: true, token });
    } catch (err) {
      console.error({ err });
      res.json({ success: false, err });
    }
  },
  async userLogin(req, res) {
    try {
      const token = getRefreshToken({
        _id: req.user._id,
        username: req.user.username,
      });
      const refreshToken = getRefreshToken({ _id: req.user._id });

      const user = await User.findById(req.user._id);
      user.currentSession = refreshToken;
      user.refreshToken.push({ refreshToken });
      await user.save();
      res.cookie("usession", refreshToken, COOKIE_OPTIONS);
      res.status(200).json({ success: true, token });
    } catch (err) {
      console.error({ err });
      res.json({ success: false, err });
    }
  },

  async adminLogout(req, res, next) {
    try {
      const { signedCookies = {} } = req;
      const { jsession } = signedCookies;
      const user = await User.findById(req.user._id);

      if (!user) {
        // Handle the case where the user is not found
        res.statusCode = 404;
        return res.send({ error: "User not found" });
      }

      const tokenIndex = user.refreshToken.findIndex(
        (item) => item.refreshToken === jsession
      );

      if (tokenIndex !== -1) {
        // Remove the token using $pull
        user.refreshToken.pull({ _id: user.refreshToken[tokenIndex]._id });
      }

      await user.save(); // Use await to save the user document

      res.clearCookie("jsession", COOKIE_OPTIONS);
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.send({ msg: "Internal server error" });
    }
  },
  async userLogout(req, res, next) {
    try {
      const { signedCookies = {} } = req;
      const { usession } = signedCookies;
      const user = await User.findById(req.user._id);

      if (!user) {
        res.statusCode = 404;
        return res.send({ error: "User not found" });
      }

      const tokenIndex = user.refreshToken.findIndex(
        (item) => item.refreshToken === usession
      );

      if (tokenIndex !== -1) {
        // Remove the token using $pull
        user.refreshToken.pull({ _id: user.refreshToken[tokenIndex]._id });
      }

      await user.save(); // Use await to save the user document

      res.clearCookie("usession", COOKIE_OPTIONS);
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.send({ msg: "Internal server error" });
    }
  },

  async changePassword(req, res, next) {
    try {
      const user = await User.findById(req.user._id);
      if (!isValidPassword(req.body.newPassword)) {
        return res
          .status(400)
          .json({ success: false, msg: "Invalid Password Length." });
      }

      user
        .changePassword(req.body.oldPassword, req.body.newPassword)
        .then(() => {
          res.send({ status: 1, msg: "Password Changed Successfully!" });
        })
        .catch((err) => {
          res.send({ status: 0, err });
        });
    } catch (err) {
      console.error({ status: 0, err });
      res.status(500).json({ success: 0, err });
    }
  },
  async checkAdminActive(req, res, next) {
    const { signedCookies = {} } = req;
    const { jsession } = signedCookies;
    if (jsession) {
      try {
        const payload = jwt.verify(jsession, process.env.REFRESH_TOKEN_SECRET);
        const userId = payload._id;

        const user = await User.findById(userId);

        if (!user) {
          res.status(401).send("Unauthorized");
          return;
        }
        if (user.level > 5 && user.level < 0) {
          res.status(401).send("Unauthorized");
        }
        // Filter out the expired refresh tokens
        user.refreshToken = user.refreshToken.filter((tokenItem) => {
          if (isTokenExpired(tokenItem.refreshToken)) {
            return false; // Remove expired token
          }
          return true; // Keep non-expired tokens
        });

        await user.save();

        const newAccessToken = getRefreshToken({ _id: userId });
        res.cookie("jsession", newAccessToken, COOKIE_OPTIONS);
        res.status(200).json({ success: true, token: newAccessToken });
      } catch (err) {
        console.error(err);
        res.clearCookie("jsession", COOKIE_OPTIONS);
        res.status(401).send("Unauthorized");
      }
    } else {
      res.status(401).send("Unauthorized");
    }
  },
  async checkUserActive(req, res, next) {
    const { signedCookies = {} } = req;
    const { usession } = signedCookies;
    if (usession) {
      try {
        const payload = jwt.verify(usession, process.env.REFRESH_TOKEN_SECRET);
        const userId = payload._id;
        const user = await User.findById(userId);
        if (!user) {
          res.status(401).send("Unauthorized");
          return;
        }
        if (user.role !== "user") {
          res.status(401).send("Unauthorized");
          return;
        }

        // Filter out the expired refresh tokens
        user.refreshToken = user.refreshToken.filter((tokenItem) => {
          if (isTokenExpired(tokenItem.refreshToken)) {
            return false; // Remove expired token
          }
          return true; // Keep non-expired tokens
        });

        await user.save();

        const newAccessToken = getRefreshToken({ _id: userId });
        res.cookie("usession", newAccessToken, COOKIE_OPTIONS);
        res.status(200).json({ success: true, token: newAccessToken });
      } catch (err) {
        console.error(err);
        res.clearCookie("usession", COOKIE_OPTIONS);
        res.status(401).send("Unauthorized");
      }
    } else {
      res.status(401).send("Unauthorized");
    }
  },
  async blockUser(req, res) {},
  async sendOtpVerificationEmail({ _id, email }, res) {
    try {
      const currentUrl = "http://localhost:8000";
      const uniqueString = uuidv4() + _id;
      const link = `${currentUrl}/api/v1/auth/verify/${_id}/${uniqueString}`;
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify Your Email.",
        html: `<p>Verify Your Email to complete signup and login into your account.</p><p>This link expires in 1 hours.</p> 
          <p>Click <a href="${link}">here</a> to verify.</p>`,
      };
      const saltRounds = 10;
      bcrypt.hash(uniqueString, saltRounds).then((hashedUniqueString) => {
        const newVerification = new UserOTPVerification({
          userId: _id,
          uniqueString: hashedUniqueString,
          createdOn: Date.now(),
          expiresOn: Date.now() + 3600000, //1 hour
        });
        newVerification
          .save()
          .then(() => {
            transporter.sendMail(mailOptions).then(() => {
              return res.json({
                status: "1",
                userCreated: true,
                msg: "Verification email send successfully. Please check your email to verify.",
              });
            });
          })
          .catch((err) => {
            console.error(err);
            return res.json({
              status: 0,
              userCreated: false,
              msg: "An error occurred while sending email.",
            });
          });
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ msg: "Internal server error" });
    }
  },
  async verifyEmail(req, res) {
    try {
      const { userId, uniqueString } = req.params;
      const result = await UserOTPVerification.find({ userId });

      if (result.length > 0) {
        const { expiresOn } = result[0];
        const hashedUniqueString = result[0].uniqueString;
        if (expiresOn < Date.now()) {
          await UserOTPVerification.deleteOne({ userId });
          let message = "Verification link expired. Please sign up or log in.";
          return res.redirect(
            `/api/v1/auth/verified/?error=true&message=${message}`
          );
        } else {
          const match = await bcrypt.compare(uniqueString, hashedUniqueString);

          if (match) {
            const resp = await User.findOneAndUpdate(
              { _id: new ObjectId(userId) },
              { verified: true },
              { new: true }
            );
            await UserOTPVerification.deleteOne({ userId });

            return res.sendFile(path.join(__dirname, "../views/verified.html"));
          } else {
            let message = "Invalid verification link.";
            return res.redirect(
              `/api/v1/auth/verified/?error=true&message=${message}`
            );
          }
        }
      } else {
        let message =
          "Account record doesn't exist or has been verified already. Please sign up or log in.";
        return res.redirect(
          `/api/v1/auth/verified/?error=true&message=${message}`
        );
      }
    } catch (err) {
      console.error(err);
      res.send({ msg: "Internal server error" });
    }
  },
  async verified(req, res) {
    return res.sendFile(path.join(__dirname, "../views/verified.html"));
  },
};

module.exports = AuthController;
