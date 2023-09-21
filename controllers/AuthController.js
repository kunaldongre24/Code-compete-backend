const CoinController = require("./CoinController");
const { countAndUpdateCoin } = require("./CoinController");
const User = require("../models/User");
const CommissionModel = require("../models/CommissionMap");
const CoinModel = require("../models/Coins");
const Count = require("../models/Count");
const {
  getToken,
  COOKIE_OPTIONS,
  getRefreshToken,
} = require("../middleware/authenticate");
const jwt = require("jsonwebtoken");
const isTokenExpired = require("../helper/isTokenExpired");

const AuthController = {
  async getMyInfo(req, res) {
    const { signedCookies = {} } = req;
    const { refreshToken } = signedCookies;
    try {
      const user = await User.findById(req.user._id);
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
  async getUserById(req, res) {
    const { id } = req.params;
    // const response = await AuthController.getUserByUid(id);
    // res.send(response);
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
      if (companyId !== "cc0001") {
        return;
      }

      const { username, password, level, name } = req.body;
      if (!username || !password || !name || !companyId || !level) {
        return res.send({ err: "Missing Information" });
      }

      const email = `${username.toLowerCase()}@fly247.in`;
      const userRecord = await fs.auth().createUser({
        email,
        password: "sa@#!$#@@$%2" + password,
        displayName: name,
      });

      const userJson = {
        uid: userRecord.uid,
        username: username.toLowerCase(),
        name,
        email,
        level,
        companyId,
      };
      await User.create(userJson);

      res.send({ userCreated: true });
    } catch (error) {
      console.error(error);
      res.send({ userCreated: false, err: "Failed to create user" });
    }
  },
  async UpdateUser(req, res) {
    const { uid, fname, lname } = req.body;
    if (uid === undefined || fname === undefined || lname === undefined) {
      return res.send({ err: "Missing Information" });
    }
    const name = fname + " " + lname;
    try {
      const user = await User.findOneAndUpdate(
        { uid: uid },
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
      const companyId = req.user.username;
      var {
        username,
        password,
        level,
        name,
        matchShare,
        fixedLimit,
        AgentMatchcommision,
        AgentSessioncommision,
      } = req.body;

      username = username.toLowerCase();
      const userData = await User.findOne({ username: companyId });
      const totalCoins = await CoinController.countCoin(
        companyId.toLowerCase()
      );
      var mShare = 0;
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

      User.register(
        new User({
          username,
          name,
          level,
          totalCoins: parseFloat(fixedLimit),
          companyId,
          matchShare: share,
          matchCommission: AgentMatchcommision,
          sessionCommission: AgentSessioncommision,
          createdOn: Date.now(),
        }),
        password,
        async (err, user) => {
          if (err) {
            res.statusCode = 500;
            console.error("Error in creating user!");
            res.send(err);
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

            res.send({
              userCreated: true,
              msg: "User has been created Successfully",
            });
          }
        }
      );
    } catch (error) {
      console.error(error);
      res.send({ userCreated: false, msg: "Some error occurred" });
    }
  },
  async login(req, res, next) {
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

      res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
      res.status(200).json({ success: true, token });
    } catch (err) {
      console.error({ err });
      res.json({ success: false, err });
    }
  },
  async logout(req, res, next) {
    const { signedCookies = {} } = req;
    const { refreshToken } = signedCookies;
    User.findById(req.user._id).then(
      (user) => {
        const tokenIndex = user.refreshToken.findIndex(
          (item) => item.refreshToken === refreshToken
        );

        if (tokenIndex !== -1) {
          user.refreshToken.id(user.refreshToken[tokenIndex]._id).remove();
        }

        user.save((err, user) => {
          if (err) {
            res.statusCode = 500;
            res.send(err);
          } else {
            res.clearCookie("refreshToken", COOKIE_OPTIONS);
            res.send({ success: true });
          }
        });
      },
      (err) => next(err)
    );
  },
  async refreshToken(req, res, next) {
    const { signedCookies = {} } = req;
    const { refreshToken } = signedCookies;
    console.log(signedCookies);
    if (refreshToken) {
      try {
        const payload = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );
        const userId = payload._id;

        const user = await User.findById(userId);

        if (!user) {
          res.status(401).send("Unauthorized");
          return;
        }

        // Find the refresh token in the user's tokens array
        const tokenIndex = user.refreshToken.findIndex(
          (item) => item.refreshToken === refreshToken
        );

        if (tokenIndex === -1) {
          res.status(401).send("Unauthorized");
          return;
        }

        // Check if the token has expired
        if (isTokenExpired(payload)) {
          // Token has expired, remove it from the user's list
          user.refreshToken.splice(tokenIndex, 1);
          await user.save();
          res.status(401).send("Unauthorized");
          return;
        }

        // Token is valid, generate a new one and replace it
        const newRefreshToken = getRefreshToken({ _id: userId });
        user.refreshToken[tokenIndex] = { refreshToken: newRefreshToken };
        await user.save();

        const newAccessToken = getToken({ _id: userId });

        res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);
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
