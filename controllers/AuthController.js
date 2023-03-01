const { fs, db, FieldValue } = require("../db");
const { v4: uuidv4 } = require('uuid');
const CoinController = require("./CoinController");
const AuthController = {
  async getUserById(req, res) {
    const { id } = req.params;
    const userRef = db.collection('users').doc(id);
    await userRef.get().then(value => {
      const data = value.data()
      res.send(data);
    })

  },
  async getUserInformation(username) {
    const userRef = db.collection('users').where("username", "==", username);
    const value = await userRef.get();
    if (value.docs.length) {
      const data = value.docs[0].data();
      return data;
    }
    return;
  },
  async getUserByUsername(req, res) {
    const { username } = req.params;
    const info = await AuthController.getUserInformation(username.toLowerCase());
    res.send(info);
  },
  async deleteUser(req, res) {
    const { id } = req.params;
    fs.auth()
      .deleteUser(id)
      .then(() => {
        const userRef = db.collection('users').doc(id).delete();
        res.send({ deleted: true })
      })
      .catch((error) => {
        res.send({ err: error })
      });
  },
  async getPlayerCount(req, res) {
    const countRef = db.collection("count").doc("player");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then(value => {
      const data = value.data();
      res.send(data);
    })
  },
  async getAgentCount(req, res) {
    const countRef = db.collection("count").doc("agent");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then(value => {
      const data = value.data();
      res.send(data);
    })
  }, async getManagerCount(req, res) {
    const countRef = db.collection("count").doc("manager");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then(value => {
      const data = value.data();
      res.send(data);
    })
  },
  async getStockistCount(req, res) {
    const countRef = db.collection("count").doc("stockist");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then(value => {
      const data = value.data();
      res.send(data);
    })
  },
  async getScCount(req, res) {
    const countRef = db.collection("count").doc("sc");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then(value => {
      const data = value.data();
      res.send(data);
    })
  },
  async getSuperStockistCount(req, res) {
    const countRef = db.collection("count").doc("superStockist");
    await countRef.update({
      count: FieldValue.increment(1),
    });
    await countRef.get().then(value => {
      const data = value.data();
      res.send(data);
    });
  }
  ,
  createManager(req, res) {
    const companyId = req.user.email.split("@")[0];
    const { username, password, level, name } = req.body;
    if (username === undefined || password === undefined || name === undefined || companyId === undefined || level === undefined) {
      return res.send({ err: "Missing Information" })
    }
    const email = `${username}@fly247.in`;
    fs.auth()
      .createUser({
        email,
        password: "sa@#!$#@@$%2" + password,
        displayName: name,
      })
      .then(async (userRecord) => {
        const userRef = db.collection('users').where("username", "==", companyId);
        await userRef.get().then(async (value) => {
          const userJson = {
            uid: userRecord.uid,
            username,
            name,
            email,
            level,
            companyId,
          };
          const usersDb = db.collection('users');
          await usersDb.doc(userRecord.uid).set(userJson);
          res.send({ userCreated: true });
        })
          .catch((error) => {
            console.log('Error creating new user:', error);
          });
      })
  }
  ,
  async signup(req, res) {
    const companyId = req.user.email.split("@")[0];
    var { username, password, level, name, matchShare, fixedLimit, AgentMatchcommision, AgentSessioncommision } = req.body;

    if (username === undefined || password === undefined || name === undefined || companyId === undefined || matchShare === undefined || level === undefined || fixedLimit === undefined || AgentMatchcommision === undefined || AgentSessioncommision === undefined) {
      return res.send({ err: "Missing Information" });
    }
    username = username.toLowerCase()
    const userInfo = await AuthController.getUserInformation(companyId);

    const totalCoins = await CoinController.countCoin(companyId.toLowerCase());
    if (userInfo.level !== 1 && totalCoins < fixedLimit) {
      return res.send({ msg: "Insufficient Balance" });
    }
    const email = `${username}@fly247.in`;
    fs.auth()
      .createUser({
        email,
        password: "sa@#!$#@@$%2" + password,
        displayName: name,

      })
      .then(async (userRecord) => {
        const userRef = db.collection('users').where("username", "==", companyId);
        await userRef.get().then(async (value) => {
          const data = value.docs[0].data();
          const share = data.matchShare - matchShare;
          const msg = `Opening Balance By ${data.username} ( ${data.name} ) To ${username} ( ${name} )`;
          const commisionDb = db.collection('commisionMap').doc(uuidv4());
          await commisionDb.set({
            setter: companyId,
            getter: username,
            matchShare: matchShare,
            matchCommission: AgentMatchcommision,
            sessionCommission: AgentSessioncommision,
            createdOn: Date.now()
          });
          const coinDb = db.collection('coinMap').doc(uuidv4());
          await coinDb.set({
            value: parseInt(fixedLimit),
            msg: msg,
            getter: username.toLowerCase(),
            setter: data.username.toLowerCase(),
            createdOn: Date.now()
          });
          const userJson = {
            uid: userRecord.uid,
            username,
            name,
            email,
            level,
            companyId,
            matchShare: share,
            matchCommission: AgentMatchcommision,
            sessionCommission: AgentSessioncommision,
          };
          const usersDb = db.collection('users');
          await usersDb.doc(userRecord.uid).set(userJson);
          res.send({ userCreated: true, msg: "User has been created Successfully" });
        })
          .catch((error) => {
            res.send({ userCreated: false, msg: "Some error occurred" })
          });
      })
  }
};

module.exports = AuthController;
