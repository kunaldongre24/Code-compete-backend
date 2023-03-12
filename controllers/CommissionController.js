const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");
const { countAndUpdateCoin } = require("./CoinController");

const CommissionController = {
  async companyShare(req, res) {
    const { username } = req.params;
    var sum = 0;
    id = username;
    if (!username) {
      res.send({ err: "Missing Information" });
    }
    const ref = db.collection("commisionMap").where("getter", "==", id);
    await ref.get().then((value) => {
      if (value.empty) {
        res.send({ msg: "No data found" });
      }
      const data = value.docs[0].data();
      res.send(data);
    });
  },
  async coinDistribution(won, userId, company, amount, id) {
    let getter = company;
    let setter = userId;
    if (won) {
      getter = userId;
      setter = company;
    }
    const type = 3;
    const coinDb = db.collection("coinMap").doc(uuidv4());
    await coinDb.set({
      value: amount,
      type: 3,
      msg: "Bet coin distribution",
      getter: getter,
      setter: setter,
      createdOn: Date.now(),
    });
    const betRef = db.collection("betUserMap").doc(id);
    await betRef.set(
      {
        settled: true,
        won,
      },
      { merge: true }
    );
  },
  async addCoin(amount, getter, setter) {
    const coinDb = db.collection("coinMap").doc(uuidv4());
    await coinDb.set({
      value: amount,
      msg: "Testing commission distribution",
      getter: getter,
      setter: setter,
      createdOn: Date.now(),
    });
    await countAndUpdateCoin(getter.toLowerCase());
    await countAndUpdateCoin(setter.toLowerCase());
  },

  async add(arr, id, value) {
    const found = arr.some((el) => el.id === id);
    if (!found) arr.push({ matchCommission: value, id: id });
    else arr.filter((el) => el.id === id)[0].matchCommission += value;
    return arr;
  },
  async remove(arr, id, value) {
    const found = arr.some((el) => el.id === id);
    if (!found) arr.push({ matchCommission: -1 * value, id: id });
    else arr.filter((el) => el.id === id)[0].matchCommission -= value;
    return arr;
  },
  async betWinning(id, dAmount, playerId, fancyName, key, won) {
    const val = {
      value: Math.abs(Math.round(dAmount * 100) / 100),
      msg: "",
      fancyName,
      bet: true,
      createdOn: Date.now(),
    };
    if (dAmount > 0) {
      val.getter = id;
      if (playerId !== id) {
        val.setter = playerId;
      }
    } else {
      val.getter = playerId;
      if (playerId !== id) {
        val.setter = id;
      }
    }
    const coinDb = db.collection("coinMap").doc(uuidv4());
    await coinDb.set(val);
    await countAndUpdateCoin(playerId.toLowerCase());
    await countAndUpdateCoin(id.toLowerCase());

    const betRef = db.collection("betDataMap").doc(key);
    await betRef.set(
      {
        settled: true,
        won,
      },
      { merge: true }
    );
  },
  async disburseSessionCoin(id, amount) {
    let sum = 0;
    let prevSum = 0;
    const arr = [{ id, commission: amount * -1, sum: sum - prevSum }];
    let prevMatchCom = 0;
    while (sum < 100 && id !== "cc0001") {
      const ref = db.collection("commisionMap").where("getter", "==", id);
      await ref.get().then(async (value) => {
        if (value.empty) {
          res.send({ msg: "No data found" });
        }
        const data = value.docs[0].data();
        prevSum = sum;
        sum += parseFloat(data.matchShare);
        const sharedComm = (amount * 3) / 100;
        const am = amount;
        const myComm = (sharedComm * data.matchShare) / 100;
        const getter = data.getter.toLowerCase(),
          setter = data.setter.toLowerCase();
        let dis = (am * data.matchShare) / 100;
        const mc = parseFloat(data.sessionCommission);
        const currentCommission = mc - prevMatchCom;
        const comDis = (amount * currentCommission) / 100;
        // if (currentCommission > 0) {

        // }
        if (arr.filter((x) => x.id === setter.toLowerCase()).length) {
          arr.filter((x) => x.id === setter.toLowerCase())[0].commission =
            dis - Math.abs(myComm);
          arr.filter((x) => x.id === setter.toLowerCase())[0].percent =
            sum - prevSum;
        } else {
          const inf = {
            id: setter.toLowerCase(),
            commission: dis - Math.abs(myComm),
            percent: sum - prevSum,
            commissionAmount: Math.abs(comDis),
          };
          arr.push(inf);
        }
        if (arr.filter((x) => x.id === getter).length) {
          arr.filter((x) => x.id === getter)[0].commission += Math.abs(comDis);
        } else {
          const inf = {
            id: getter,
            commission: Math.abs(comDis),
            percent: sum - prevSum,
            commissionAmount: Math.abs(comDis),
          };
          arr.push(inf);
        }
        prevMatchCom = mc;
        id = setter;
      });
    }
    return arr;
  },

  async disburseMatchCoin(id, amount) {
    let sum = 0;
    let prevSum = 0;
    const arr = [{ id, commission: amount * -1, sum: sum - prevSum }];
    let prevMatchCom = 0;
    while (sum < 100 && id !== "cc0001") {
      const ref = db.collection("commisionMap").where("getter", "==", id);
      await ref.get().then(async (value) => {
        if (value.empty) {
          res.send({ msg: "No data found" });
        }
        const data = value.docs[0].data();
        prevSum = sum;
        sum += parseFloat(data.matchShare);
        const sharedComm = (amount * 3) / 100;
        const am = amount;
        const myComm = (sharedComm * data.matchShare) / 100;
        const getter = data.getter.toLowerCase(),
          setter = data.setter.toLowerCase();
        let dis = (am * data.matchShare) / 100;
        const mc = parseFloat(data.matchCommission);
        const currentCommission = mc - prevMatchCom;
        const comDis = (amount * currentCommission) / 100;

        if (arr.filter((x) => x.id === setter.toLowerCase()).length) {
          arr.filter((x) => x.id === setter.toLowerCase())[0].commission =
            dis - Math.abs(myComm);
          arr.filter((x) => x.id === setter.toLowerCase())[0].percent =
            sum - prevSum;
        } else {
          const inf = {
            id: setter.toLowerCase(),
            commission: dis - Math.abs(myComm),
            percent: sum - prevSum,
            commissionAmount: Math.abs(comDis),
          };
          arr.push(inf);
        }
        if (arr.filter((x) => x.id === getter).length) {
          arr.filter((x) => x.id === getter)[0].commission += Math.abs(comDis);
        } else {
          const inf = {
            id: getter,
            commission: Math.abs(comDis),
            percent: sum - prevSum,
            commissionAmount: Math.abs(comDis),
          };
          arr.push(inf);
        }

        // console.log(setter, dis, currentCommission)
        prevMatchCom = mc;
        id = setter;
      });
    }
    return arr;
  },
  async distributeCoin(req, res) {
    // const { username, amount } = req.body;
    // if ((username === undefined, amount === undefined)) {
    //   res.send({ err: "Missing Information" });
    // }
    // const id = username.toLowerCase();
    // const arr = await CommissionController.disburseCoin(id, amount);
    res.send({ msg: "error" });
  },
};

module.exports = CommissionController;
