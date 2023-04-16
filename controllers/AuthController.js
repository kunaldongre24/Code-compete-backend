const { fs, db, FieldValue } = require("../db");
const { v4: uuidv4 } = require("uuid");
const CoinController = require("./CoinController");
const { countAndUpdateCoin } = require("./CoinController");
const AuthController = {
  async getUserByUid(uid) {
    try {
      const userRef = db.collection("users").doc(uid);
      const value = await userRef.get();
      const data = value.data();
      return data;
    } catch (error) {
      console.log(error);
    }
    return;
  },
  async getLiveTime(req, res) {
    const time = Date.now();
    res.send({ time });
  },
  async getMyAgents(username) {
    const userRef = db.collection("users").where("companyId", "==", username);
    const value = await userRef.get();
    const arr = [];
    value.forEach((doc) => {
      arr.push(doc.data());
    });
    return arr;
  },
  async getMyClients(username) {
    const userRef = db
      .collection("users")
      .where("companyId", "==", username)
      .where("level", "==", 6);
    const value = await userRef.get();
    const arr = [];
    value.forEach((doc) => {
      arr.push(doc.data());
    });
    return arr;
  },
  async getUserById(req, res) {
    const { id } = req.params;
    const response = await AuthController.getUserByUid(id);
    res.send(response);
  },
  async getUserInformation(username) {
    const userRef = db.collection("users").where("username", "==", username);
    const value = await userRef.get();
    if (value.docs.length) {
      const data = value.docs[0].data();
      return data;
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
    const countRef = db.collection("count").doc("player");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },
  async getAgentCount(req, res) {
    const countRef = db.collection("count").doc("agent");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },
  async getManagerCount(req, res) {
    const countRef = db.collection("count").doc("manager");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },
  async getStockistCount(req, res) {
    const countRef = db.collection("count").doc("stockist");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },
  async getScCount(req, res) {
    const countRef = db.collection("count").doc("sc");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },
  async getSuperStockistCount(req, res) {
    const countRef = db.collection("count").doc("superStockist");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then((value) => {
      const data = value.data();
      res.send(data);
    });
  },

  createManager(req, res) {
    const companyId = req.user.email.split("@")[0];
    const { username, password, level, name } = req.body;
    if (
      username === undefined ||
      password === undefined ||
      name === undefined ||
      companyId === undefined ||
      level === undefined
    ) {
      return res.send({ err: "Missing Information" });
    }
    const email = `${username}@fly247.in`;
    fs.auth()
      .createUser({
        email,
        password: "sa@#!$#@@$%2" + password,
        displayName: name,
      })
      .then(async (userRecord) => {
        const userRef = db
          .collection("users")
          .where("username", "==", companyId);
        await userRef
          .get()
          .then(async (value) => {
            const userJson = {
              uid: userRecord.uid,
              username,
              name,
              email,
              level,
              companyId,
            };
            const usersDb = db.collection("users");
            await usersDb.doc(userRecord.uid).set(userJson);
            res.send({ userCreated: true });
          })
          .catch((error) => {
            console.log("Error creating new user:", error);
          });
      });
  },
  async UpdateUser(req, res) {
    const { uid, fname, lname } = req.body;
    if (uid === undefined || fname === undefined || lname === undefined) {
      return res.send({ err: "Missing Information" });
    }
    const name = fname + " " + lname;
    const usersDb = db.collection("users");
    const userJson = {
      name,
    };
    await usersDb.doc(uid).update(userJson);
    res.send({
      userCreated: true,
      msg: "User has been created Successfully",
    });
  },
  async signup(req, res) {
    try {
      const companyId = req.user.email.split("@")[0];
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
      const userInfo = await AuthController.getUserInformation(companyId);
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

      const userRef = db.collection("users").where("username", "==", companyId);
      const value = await userRef.get();

      const data = value.docs[0].data();
      const share = data.matchShare - matchShare;
      const type = 1;
      const p1Coins = await CoinController.countCoin(data.username);
      const p2Coins = await CoinController.countCoin(username);
      const msg = `Opening Balance By ${data.username} ( ${data.name} ) To ${username} ( ${name} )`;
      const commisionDb = db.collection("commisionMap").doc(uuidv4());
      await commisionDb.set({
        setter: companyId,
        getter: username,
        matchShare: matchShare,
        getterPreviousLimit: p2Coins ? p2Coins : 0,
        setterPreviousLimit: p1Coins ? p1Coins : 0,
        matchCommission: AgentMatchcommision,
        sessionCommission: AgentSessioncommision,
        createdOn: Date.now(),
      });

      const coinDb = db.collection("coinMap").doc(uuidv4());
      await coinDb.set({
        value: parseFloat(fixedLimit),
        msg: msg,
        type,
        getter: username.toLowerCase(),
        setter: data.username.toLowerCase(),
        setterPreviousLimit: p2Coins ? p2Coins : 0,
        getterPreviousLimit: p1Coins ? p1Coins : 0,
        createdOn: Date.now(),
      });

      const userJson = {
        uid: userRecord.uid,
        username,
        name,
        email,
        level,
        companyId,
        matchShare: share,
        matchCommission: AgentMatchcommision ? AgentMatchcommision : 0,
        sessionCommission: AgentSessioncommision ? AgentSessioncommision : 0,
        createdOn: Date.now(),
      };
      const usersDb = db.collection("users");
      await usersDb.doc(userRecord.uid).set(userJson);

      countAndUpdateCoin(username);
      countAndUpdateCoin(data.username);

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
