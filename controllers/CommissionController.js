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
  async coinDistribution(won, userId, company, amount, id, matchId) {
    let getter = company;
    let setter = userId;
    if (won) {
      getter = userId;
      setter = company;
    }
    const coinDb = db.collection("coinMap").doc(uuidv4());
    await coinDb.set({
      value: amount,
      type: 3,
      msg: "Bet coin distribution",
      matchId,
      getter,
      setter,
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
  async betWinning(id, dAmount, playerId, fancyName, key, won, matchId) {
    const val = {
      value: Math.abs(Math.round(dAmount * 100) / 100),
      msg: "",
      fancyName,
      matchId,
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
  async checkDistribution(req, res) {
    const { id, amount } = req.body;
    const response = await CommissionController.disburseSessionCoin(id, amount);
    res.send(response);
  },
  async disburseSessionCoin(id, amount) {
    let sum = 0;
    let prevSum = 0;
    const arr = [{ id, commission: amount * -1, sum: sum - prevSum }];
    let prevMatchCom = 0;
    var comSum = 0;
    var ccComPerc = 0;
    var ccComAmount = 0;
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
        comSum += currentCommission;
        var comDis = (amount * currentCommission) / 100;
        if (setter.toLowerCase() === "cc0001") {
          ccComAmount = (amount * (3 - comSum)) / 100;
          ccComPerc = 3 - comSum;
        }

        if (arr.filter((x) => x.id === setter.toLowerCase()).length) {
          arr.filter((x) => x.id === setter.toLowerCase())[0].commission =
            dis - Math.abs(myComm);
          arr.filter((x) => x.id === setter.toLowerCase())[0].percent =
            sum - prevSum;
        } else {
          const inf = {
            id: setter.toLowerCase(),
            commission: dis - Math.abs(myComm),
            myComm,
            percent: sum - prevSum,
          };
          arr.push(inf);
        }

        if (arr.filter((x) => x.id === getter).length) {
          arr.filter((x) => x.id === getter)[0].commission += Math.abs(comDis);
          arr.filter((x) => x.id === getter)[0].commissionAmount =
            Math.abs(comDis);
          arr.filter((x) => x.id === getter)[0].commissionPercentage =
            currentCommission;
        } else {
          const inf = {
            id: getter,
            commission: Math.abs(comDis),
            myComm,
            percent: sum - prevSum,
          };
          arr.push(inf);
        }
        prevMatchCom = mc;
        id = setter;
      });
    }
    arr.filter((x) => x.id === "cc0001")[0].commission += Math.abs(ccComAmount);
    arr.filter((x) => x.id === "cc0001")[0].commissionAmount =
      Math.abs(ccComAmount);
    arr.filter((x) => x.id === "cc0001")[0].commissionPercentage =
      Math.abs(ccComPerc);
    return arr;
  },

  async disburseMatchCoin(id, amount) {
    let sum = 0;
    let prevSum = 0;
    const arr = [{ id, commission: amount * -1, sum: sum - prevSum }];
    let prevMatchCom = 0;
    var comSum = 0;
    var ccComPerc = 0;
    var ccComAmount = 0;
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
        comSum += currentCommission;
        var comDis = (amount * currentCommission) / 100;
        if (setter.toLowerCase() === "cc0001") {
          ccComAmount = (amount * (3 - comSum)) / 100;
          ccComPerc = 3 - comSum;
        }

        if (arr.filter((x) => x.id === setter.toLowerCase()).length) {
          arr.filter((x) => x.id === setter.toLowerCase())[0].commission =
            dis - Math.abs(myComm);
          arr.filter((x) => x.id === setter.toLowerCase())[0].percent =
            sum - prevSum;
        } else {
          const inf = {
            id: setter.toLowerCase(),
            commission: dis - Math.abs(myComm),
            myComm,
            percent: sum - prevSum,
          };
          arr.push(inf);
        }

        if (arr.filter((x) => x.id === getter).length) {
          arr.filter((x) => x.id === getter)[0].commission += Math.abs(comDis);
          arr.filter((x) => x.id === getter)[0].commissionAmount =
            Math.abs(comDis);
          arr.filter((x) => x.id === getter)[0].commissionPercentage =
            currentCommission;
        } else {
          const inf = {
            id: getter,
            commission: Math.abs(comDis),
            myComm,
            percent: sum - prevSum,
          };
          arr.push(inf);
        }
        prevMatchCom = mc;
        id = setter;
      });
    }
    arr.filter((x) => x.id === "cc0001")[0].commission += Math.abs(ccComAmount);
    arr.filter((x) => x.id === "cc0001")[0].commissionAmount =
      Math.abs(ccComAmount);
    arr.filter((x) => x.id === "cc0001")[0].commissionPercentage =
      Math.abs(ccComPerc);
    return arr;
  },
  async distributeCoin(req, res) {
    const { username, amount } = req.body;
    if ((username === undefined, amount === undefined)) {
      res.send({ err: "Missing Information" });
    }
    const id = username.toLowerCase();
    const arr = await CommissionController.disburseMatchCoin(id, amount);
    res.send(arr);
  },
};

module.exports = CommissionController;
