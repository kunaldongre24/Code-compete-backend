const CoinController = require("./CoinController");
const { countAndUpdateCoin } = require("./CoinController");
const User = require("../models/User");
const CommissionModel = require("../models/CommissionMap");
const CoinModel = require("../models/Coins");
const Count = require("../models/Count");
const { v4: uuidv4 } = require("uuid");

const {
  getToken,
  COOKIE_OPTIONS,
  getRefreshToken,
} = require("../middleware/authenticate");
const jwt = require("jsonwebtoken");
const isTokenExpired = require("../helper/isTokenExpired");
const { ObjectId } = require("mongodb");
const isValidPassword = require("../helper/isValidPassword");

const AuthController = {
  async getMyInfo(req, res) {
    try {
      const user = await User.findById(req.user._id).select({
        level: 1,
        name: 1,
        sessionCommission: 1,
        totalCoins: 1,
        matchCommission: 1,
        username: 1,
        matchShare: 1,
        companyId: 1,
        _id: 1,
      });
      res.send(user);
    } catch (err) {
      res.send(err);
    }
  },
  async getLiveTime(req, res) {
    const time = Date.now();
    res.send({ time });
  },
  async getMyAgents(username) {
    try {
      const users = await User.find({ companyId: username }).exec();
      return users;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  async getMyClients(username) {
    try {
      const users = await User.find({
        companyId: username,
        level: 6,
      }).exec();
      return users;
    } catch (error) {
      console.error(error);
      throw error;
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
  async getPlayerCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "player" },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json(updatedCount);
    } catch (error) {
      res.json({ message: error.message });
    }
  },
  async getAgentCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "agent" },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json(updatedCount);
    } catch (error) {
      res.json({ message: error.message });
    }
  },
  async getManagerCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "manager" },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json(updatedCount);
    } catch (error) {
      res.json({ message: error.message });
    }
  },
  async getStockistCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "stockist" },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json(updatedCount);
    } catch (error) {
      res.json({ message: error.message });
    }
  },
  async getScCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "superCompany" },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json(updatedCount);
    } catch (error) {
      console.error(error);
      res.json({ message: error });
    }
  },
  async getSuperStockistCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "superStockist" },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json(updatedCount);
    } catch (error) {
      res.json({ message: error.message });
    }
  },

  async createManager(req, res) {
    try {
      const companyId = req.user.username;

      const result = await Count.findOne({ name: "manager" });
      const username = `ma${result.count + 1}`;
      const { password, level, name } = req.body;
      if (!username || !password || !name || !companyId) {
        return res.send({ err: "Missing Information" });
      }

      const userData = await User.findOne({ username: companyId });
      if (userData.level !== 1) {
        return res.send({
          userCreated: false,
          msg: "Insufficient Permissions!",
        });
      }

      User.register(
        new User({
          username,
          name,
          level,
          companyId,
          createdOn: Date.now(),
        }),
        password,
        async (err, user) => {
          if (err) {
            res.statusCode = 500;
            console.error(err);
            return res.send({ userCreated: false, msg: "Err" });
          } else {
            res.send({
              userCreated: true,
              msg: "User has been created Successfully",
            });
          }
        }
      );
      res.send({ userCreated: true });
    } catch (error) {
      console.error(error);
      res.send({ userCreated: false, err: "Failed to create user" });
    }
  },
  async UpdateUser(req, res) {
    const { fname, lname, _id } = req.body;
    if (fname === undefined || lname === undefined) {
      return res.send({ err: "Missing Information" });
    }
    const userDetails = await AuthController.getUserBy_id(new ObjectId(_id));
    if (userDetails.companyId !== req.user.username) {
      res.send({ userUpdated: false, msg: "Insufficient Permissions!" });
    }
    const name = fname + " " + lname;
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
      if (req.user.level < 2 && req.user.level === 6) {
        res.send({ userCreated: false, msg: "Not Allowed!" });
        return;
      }
      const companyId = req.user.username;
      var { username, password, level, name, matchShare, fixedLimit } =
        req.body;

      if (!isValidPassword(password)) {
        return res
          .status(400)
          .json({ userCreated: false, msg: "Invalid Password Length." });
      }
      username = username.toLowerCase();
      const userData = await User.findOne({ username: companyId });
      const totalCoins = await CoinController.countCoin(
        companyId.toLowerCase()
      );
      var mShare = 0;
      if (level < 1 || level > 7) {
        res.send({
          userCreated: false,
          msg: "Invalid Level!",
        });
        return;
      }
      if (level <= userData.level) {
        res.send({
          userCreated: false,
          msg: "Insufficient Permissions!",
        });
        return;
      }
      if (level === 6) {
        mShare = userData.matchShare;
      } else {
        mShare = matchShare;
      }
      if (parseInt(userData.level) !== 1 && totalCoins < fixedLimit) {
        console.log("Insufficient Balance");
        res.send({ userCreated: false, msg: "Insufficient Balance" });
        return;
      }
      const share = userData.matchShare - mShare;
      const AgentMatchcommision = level < 6 ? 3 : 0;
      const AgentSessioncommision = level < 6 ? 3 : 0;
      User.register(
        new User({
          username,
          name,
          level,
          totalCoins: parseFloat(fixedLimit),
          companyId,
          matchShare: share,
          currentSession: uuidv4(),
          matchCommission: AgentMatchcommision,
          sessionCommission: AgentSessioncommision,
          createdOn: Date.now(),
        }),
        password,
        async (err, user) => {
          if (err) {
            res.statusCode = 500;
            console.error(err);
            return res.send({ userCreated: false, msg: "Err" });
          } else {
            const p1Coins = await CoinController.countCoin(userData.username);
            const p2Coins = await CoinController.countCoin(username);

            const msg = `Opening Balance By ${userData.username} (${userData.name}) To ${username} (${name})`;
            const commisionData = {
              setter: companyId,
              getter: username,
              matchShare: mShare,
              getterPreviousLimit: p2Coins ? p2Coins : 0,
              setterPreviousLimit: p1Coins ? p1Coins : 0,
              matchCommission: AgentMatchcommision,
              sessionCommission: AgentSessioncommision,
              createdOn: Date.now(),
            };

            await CommissionModel.create(commisionData);

            const coinData = {
              value: parseFloat(fixedLimit),
              msg: msg,
              type: 1,
              getter: username.toLowerCase(),
              setter: userData.username.toLowerCase(),
              setterPreviousLimit: p1Coins ? p1Coins : 0,
              getterPreviousLimit: 0,
              createdOn: Date.now(),
            };

            await CoinModel.create(coinData);

            countAndUpdateCoin(username);
            countAndUpdateCoin(userData.username);

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
      const token = getToken({
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
  async userLogin(req, res, next) {
    try {
      const token = getToken({
        _id: req.user._id,
        username: req.user.username,
      });
      const refreshToken = getRefreshToken({ _id: req.user._id });

      const user = await User.findById(req.user._id);
      user.currentSession = refreshToken; // Set the current session
      user.refreshToken.push({ refreshToken });
      await user.save();

      res.cookie("usession", refreshToken, COOKIE_OPTIONS);
      res.status(200).json({ success: true, token });
    } catch (err) {
      console.error({ err });
      res.json({ success: false, err });
    }
  },
  async managerLogin(req, res, next) {
    try {
      const token = getToken({
        _id: req.user._id,
        username: req.user.username,
      });
      const refreshToken = getRefreshToken({ _id: req.user._id });

      const user = await User.findById(req.user._id);
      user.currentSession = refreshToken; // Set the current session
      user.refreshToken.push({ refreshToken });
      await user.save();
      res.cookie("msession", refreshToken, COOKIE_OPTIONS);
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
      res.send(err);
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
      res.send(err);
    }
  },
  async managerLogout(req, res, next) {
    try {
      const { signedCookies = {} } = req;
      const { msession } = signedCookies;
      const user = await User.findById(req.user._id);

      if (!user) {
        res.statusCode = 404;
        return res.send({ error: "User not found" });
      }

      const tokenIndex = user.refreshToken.findIndex(
        (item) => item.refreshToken === msession
      );

      if (tokenIndex !== -1) {
        // Remove the token using $pull
        user.refreshToken.pull({ _id: user.refreshToken[tokenIndex]._id });
      }

      await user.save(); // Use await to save the user document

      res.clearCookie("msession", COOKIE_OPTIONS);
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.send(err);
    }
  },
  async userLogout(req, res, next) {
    try {
      const { signedCookies = {} } = req;
      const { usession } = signedCookies;
      const user = await User.findById(req.user._id);

      if (!user) {
        // Handle the case where the user is not found
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

      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.send(err);
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

        const newAccessToken = getToken({ _id: userId });

        res.status(200).json({ success: true, token: newAccessToken });
      } catch (err) {
        console.error(err);
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
        if (user.level !== 6) {
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

        const newAccessToken = getToken({ _id: userId });

        res.status(200).json({ success: true, token: newAccessToken });
      } catch (err) {
        console.error(err);
        res.status(401).send("Unauthorized");
      }
    } else {
      res.status(401).send("Unauthorized");
    }
  },
  async checkManagerActive(req, res, next) {
    const { signedCookies = {} } = req;
    const { msession } = signedCookies;
    if (msession) {
      try {
        const payload = jwt.verify(msession, process.env.REFRESH_TOKEN_SECRET);
        const userId = payload._id;

        const user = await User.findById(userId);

        if (!user) {
          res.status(401).send("Unauthorized");
          return;
        }
        if (user.level !== 6) {
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

        const newAccessToken = getToken({ _id: userId });

        res.status(200).json({ success: true, token: newAccessToken });
      } catch (err) {
        console.error(err);
        res.status(401).send("Unauthorized");
      }
    } else {
      res.status(401).send("Unauthorized");
    }
  },
};

module.exports = AuthController;
