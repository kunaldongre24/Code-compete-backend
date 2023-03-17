const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");

const CoinController = {
  async addCoins(data) {
    const { coins, msg, setter, getter } = data;
    const coinDb = db.collection("coinMap").doc(uuidv4());
    await coinDb.set({
      value: coins,
      msg,
      getter,
      setter,
      createdOn: Date.now(),
    });
    await CoinController.countAndUpdateCoin(getter.toLowerCase());
    await CoinController.countAndUpdateCoin(setter.toLowerCase());
  },

  async countAndUpdateCoin(username) {
    const totalCoins = await CoinController.countCoin(username);
    const userRef = db.collection("users").where("username", "==", username);
    const resp = await userRef.get();

    if (resp.empty) {
      console.log("No matching documents.");
      return;
    }
    resp.forEach((doc) => {
      doc.ref.set(
        { totalCoins: Math.round(parseFloat(totalCoins) * 100) / 100 },
        { merge: true }
      );
    });
  },
  async limitControl(req, res) {
    const { type, username, amount } = req.body;
    if (type === undefined || username === undefined || amount === undefined) {
      res.send({ status: 0, msg: "Missing Information" });
    }
    const user = req.user.email.split("@")[0];
    const userRef = db.collection("users").where("username", "==", username);
    const value = await userRef.get();
    if (value.docs.length) {
      const userInfo = value.docs[0].data();
      const coinDb = db.collection("coinMap").doc(uuidv4());
      const userDisplayName = userInfo.name;
      const p1Coins = await CoinController.countCoin(user);
      const p2Coins = await CoinController.countCoin(username);

      if (parseInt(type) === 1) {
        const msg = `Limit increased of ${userDisplayName}(${username}) by ${req.user.name}(${user})`;
        await coinDb.set({
          value: Math.abs(parseFloat(amount)),
          msg,
          getter: username,
          setter: user,
          getterPreviousLimit: p2Coins,
          setterPreviousLimit: p1Coins,
          createdOn: Date.now(),
          type: "Limit",
        });
      } else if (parseInt(type) === 0) {
        const msg = `Limit decreased of ${userDisplayName}(${username}) by ${req.user.name}(${user})`;
        await coinDb.set({
          value: Math.abs(parseFloat(amount)),
          msg,
          getter: user,
          setter: username,
          getterPreviousLimit: p1Coins,
          setterPreviousLimit: p2Coins,
          type: "Limit",
          createdOn: Date.now(),
        });
      } else {
        res.send({ status: 0, msg: "Unknown Error Occured" });
      }
    } else {
      res.send({ status: 0, msg: "User not found" });
    }
    await CoinController.countAndUpdateCoin(username.toLowerCase());
    await CoinController.countAndUpdateCoin(user.toLowerCase());
    res.send({
      status: 1,
      msg: parseInt(type) === 1 ? "Limit Increased" : "Limit Decreased",
    });
  },
  async countCoin(username) {
    let sum = 0;
    const id = username;
    if (!username) {
      res.send({ err: "Missing Information" });
    }
    const query1 = db.collection("coinMap").where("getter", "==", id);
    const query2 = db.collection("coinMap").where("setter", "==", id);

    const snapshot1 = await query1.get();
    snapshot1.forEach((doc) => {
      if (doc.data().getter === id) {
        const val = parseFloat(doc.data().value);
        sum += val ? val : 0;
      }
    });
    const snapshot2 = await query2.get();
    snapshot2.forEach((doc) => {
      if (doc.data().setter === id) {
        const val = parseFloat(doc.data().value);
        sum -= val ? val : 0;
      }
    });
    return sum;
  },
  async getLimit(username) {
    const id = username;
    if (!username) {
      res.send({ err: "Missing Information" });
    }
    const query1 = db
      .collection("coinMap")
      .where("getter", "==", id)
      .where("type", "==", "Limit");
    const query2 = db
      .collection("coinMap")
      .where("setter", "==", id)
      .where("type", "==", "Limit");
    const arr = [];
    const snapshot1 = await query1.get();
    snapshot1.forEach((doc) => {
      if (doc.data().getter === id) {
        arr.push(doc.data());
      }
    });
    const snapshot2 = await query2.get();
    snapshot2.forEach((doc) => {
      if (doc.data().setter === id) {
        arr.push(doc.data());
      }
    });
    return arr;
  },
  async getTotalCoins(req, res) {
    const { username } = req.params;
    const sum = await CoinController.countCoin(username);
    res.send({ totalCoins: Math.round(sum * 100) / 100 });
  },
  async getUserLimit(req, res) {
    const { username } = req.params;
    const response = await CoinController.getLimit(username);
    res.send(response);
  },
  async deleteBetCoins(req, res) {
    const { id } = req.params;
    var coinDelete = db.collection("coinMap").where("setter", "==", id);
    var betDelete = db.collection("matchBetMap").where("userId", "==", id);
    var sbetDelete = db.collection("betDataMap").where("userId", "==", id);
    var gbetDelete = db
      .collection("coinMap")
      .where("getter", "==", id)
      .where("value", "<", 10000);
    var nbetDelete = db
      .collection("coinMap")
      .where("getter", "==", id)
      .where("type", "==", "Limit");
    var ubetDelete = db.collection("betUserMap").where("player", "==", id);
    coinDelete.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete();
      });
    });
    betDelete.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete();
      });
    });
    sbetDelete.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete();
      });
    });
    gbetDelete.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete();
      });
    });
    nbetDelete.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete();
      });
    });
    ubetDelete.get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete();
      });
    });
    await CoinController.countAndUpdateCoin(id);
    res.send({ msg: "Deleted coins" });
  },
};

module.exports = CoinController;
