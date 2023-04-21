const { fs } = require("../db");
const CoinController = require("./CoinController");
const { countAndUpdateCoin } = require("./CoinController");
const UserModel = require("../models/User");
const CommissionModel = require("../models/CommissionMap");
const CoinModel = require("../models/Coins");
const Count = require("../models/Count");

const AuthController = {
  async getUserByUid(uid) {
    try {
      const user = await UserModel.findOne({ uid: uid }).exec();
      return user;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  async getLiveTime(req, res) {
    const time = Date.now();
    res.send({ time });
  },
  async getMyAgents(username) {
    try {
      const users = await UserModel.find({ companyId: username }).exec();
      return users;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  async getMyClients(username) {
    try {
      const users = await UserModel.find({
        companyId: username,
        level: 6,
      }).exec();
      return users;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  async getUserById(req, res) {
    const { id } = req.params;
    const response = await AuthController.getUserByUid(id);
    res.send(response);
  },
  async getUserInformation(username) {
    const user = await UserModel.findOne({ username: username });
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
        { new: true }
      );
      res.status(200).json(updatedCount);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  async getAgentCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "agent" },
        { $inc: { count: 1 } },
        { new: true }
      );
      res.status(200).json(updatedCount);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  async getManagerCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "manager" },
        { $inc: { count: 1 } },
        { new: true }
      );
      res.status(200).json(updatedCount);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  async getStockistCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "stockist" },
        { $inc: { count: 1 } },
        { new: true }
      );
      res.status(200).json(updatedCount);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  async getScCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "superCompany" },
        { $inc: { count: 1 } },
        { new: true }
      );
      res.status(200).json(updatedCount);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error });
    }
  },
  async getSuperStockistCount(req, res) {
    try {
      const updatedCount = await Count.findOneAndUpdate(
        { name: "superStockist" },
        { $inc: { count: 1 } },
        { new: true }
      );
      res.status(200).json(updatedCount);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // createManager(req, res) {
  //   const companyId = req.user.email.split("@")[0];
  //   const { username, password, level, name } = req.body;
  //   if (
  //     username === undefined ||
  //     password === undefined ||
  //     name === undefined ||
  //     companyId === undefined ||
  //     level === undefined
  //   ) {
  //     return res.send({ err: "Missing Information" });
  //   }
  //   const email = `${username}@fly247.in`;
  //   fs.auth()
  //     .createUser({
  //       email,
  //       password: "sa@#!$#@@$%2" + password,
  //       displayName: name,
  //     })
  //     .then(async (userRecord) => {
  //       const userRef = db
  //         .collection("users")
  //         .where("username", "==", companyId);
  //       await userRef
  //         .get()
  //         .then(async (value) => {
  //           const userJson = {
  //             uid: userRecord.uid,
  //             username,
  //             name,
  //             email,
  //             level,
  //             companyId,
  //           };
  //           const usersDb = db.collection("users");
  //           await usersDb.doc(userRecord.uid).set(userJson);
  //           res.send({ userCreated: true });
  //         })
  //         .catch((error) => {
  //           console.log("Error creating new user:", error);
  //         });
  //     });
  // },
  async UpdateUser(req, res) {
    const { uid, fname, lname } = req.body;
    if (uid === undefined || fname === undefined || lname === undefined) {
      return res.send({ err: "Missing Information" });
    }
    const name = fname + " " + lname;
    try {
      const user = await UserModel.findOneAndUpdate(
        { uid: uid },
        { name: name },
        { new: true }
      );
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      return res.status(200).send({
        userUpdated: true,
        msg: "User has been updated successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: "Internal server error" });
    }
  },
  async signup(req, res) {
    try {
      const companyId = "cc0001";
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

      if (
        username === undefined ||
        password === undefined ||
        name === undefined ||
        companyId === undefined ||
        matchShare === undefined ||
        level === undefined ||
        fixedLimit === undefined ||
        AgentMatchcommision === undefined ||
        AgentSessioncommision === undefined
      ) {
        return res.send({ userCreated: false, msg: "Missing Information" });
      }

      username = username.toLowerCase();
      const userInfo = await UserModel.findOne({ username: companyId });
      const totalCoins = await CoinController.countCoin(
        companyId.toLowerCase()
      );
      if (userInfo.level !== 1 && totalCoins < fixedLimit) {
        return res.send({ msg: "Insufficient Balance" });
      }

      const email = `${username}@fly247.in`;

      const userRecord = await fs.auth().createUser({
        email,
        password: "sa@#!$#@@$%2" + password,
        displayName: name,
      });

      const userRef = UserModel.where("username", companyId);
      const userData = await userRef.findOne();

      const share = userData.matchShare - matchShare;
      const p1Coins = await CoinController.countCoin(userData.username);
      const p2Coins = await CoinController.countCoin(username);

      const msg = `Opening Balance By ${userData.username} (${userData.name}) To ${username} (${name})`;
      const commisionData = {
        setter: companyId,
        getter: username,
        matchShare: matchShare,
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
        setterPreviousLimit: p2Coins ? p2Coins : 0,
        getterPreviousLimit: parseFloat(fixedLimit),
        createdOn: Date.now(),
      };

      const newCoin = await CoinModel.create(coinData);

      const userJson = {
        uid: userRecord.uid,
        username,
        name,
        email,
        level,
        totalCoins: parseFloat(fixedLimit),
        companyId,
        matchShare: share,
        matchCommission: AgentMatchcommision ? AgentMatchcommision : 0,
        sessionCommission: AgentSessioncommision ? AgentSessioncommision : 0,
        createdOn: Date.now(),
      };

      await UserModel.create(userJson);

      countAndUpdateCoin(username);
      countAndUpdateCoin(userData.username);

      res.send({
        userCreated: true,
        msg: "User has been created Successfully",
      });
    } catch (error) {
      console.error(error);
      res.send({ userCreated: false, msg: "Some error occurred" });
    }
  },
};

module.exports = AuthController;
