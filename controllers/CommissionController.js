const { db } = require("../db");
const { countAndUpdateCoin } = require("./CoinController");
const CommissionModel = require("../models/CommissionMap");
const CoinModel = require("../models/Coins");
const BetUserMap = require("../models/BetUserMap");
const BetDataMap = require("../models/BetDataMap");

const CommissionController = {
  async companyShare(req, res) {
    const { username } = req.params;
    const id = username;
    if (!username) {
      return res.send({ err: "Missing Information" });
    }
    try {
      const commission = await CommissionModel.findOne({ getter: id });
      if (!commission) {
        return res.send({ msg: "No data found" });
      }
      res.send(commission);
    } catch (err) {
      console.error(err);
      res.send({ err: "An error occurred while fetching data" });
    }
  },
  async coinDistribution(won, userId, company, amount, id, matchId) {
    let getter = company;
    let setter = userId;
    if (won) {
      getter = userId;
      setter = company;
    }
    if (Math.abs(amount) > 0) {
      const coin = new CoinModel({
        value: amount,
        type: 3,
        msg: "Bet coin distribution",
        matchId,
        getter,
        setter,
        createdOn: Date.now(),
      });
      await coin.save();
    }
    try {
      const bet = await BetUserMap.findById(id);
      if (!bet) {
        return;
      }
      bet.set({
        settled: true,
        won,
      });
      await bet.save();
    } catch (err) {
      console.error(err);
    }
  },
  async addCoin(amount, getter, setter) {
    const coin = new CoinModel({
      value: amount,
      msg: "Testing commission distribution",
      getter: getter,
      setter: setter,
      createdOn: Date.now(),
    });
    await coin.save();
    countAndUpdateCoin(getter.toLowerCase());
    countAndUpdateCoin(setter.toLowerCase());
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
    const coin = new CoinModel(val);
    await coin.save();
    countAndUpdateCoin(playerId.toLowerCase());
    countAndUpdateCoin(id.toLowerCase());
    const bet = await BetDataMap.findOneAndUpdate(
      { _id: key },
      { settled: true, won: won },
      { new: true }
    );
    return bet;
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
    while (id !== "cc0001") {
      const commission = await CommissionModel.findOne({ getter: id });
      if (!commission) {
        return console.log("No data found");
      }
      const { matchShare, sessionCommission, setter } = commission;
      prevSum = sum;
      sum += parseFloat(matchShare);
      const sharedComm = (amount * 3) / 100;
      const am = amount;
      const myComm = (sharedComm * matchShare) / 100;
      const getter = id.toLowerCase(),
        setterId = setter.toLowerCase();
      let dis = (am * matchShare) / 100;
      const mc = parseFloat(sessionCommission);
      const currentCommission = mc - prevMatchCom;
      comSum += currentCommission;
      var comDis = (amount * currentCommission) / 100;
      if (setterId === "cc0001") {
        ccComAmount = (amount * (3 - comSum)) / 100;
        ccComPerc = 3 - comSum;
      }

      if (arr.filter((x) => x.id === setterId).length) {
        arr.filter((x) => x.id === setterId)[0].commission = dis;
        arr.filter((x) => x.id === setterId)[0].percent = sum - prevSum;
      } else {
        const inf = {
          id: setterId,
          commission: dis,
          myComm,
          percent: sum - prevSum,
        };
        arr.push(inf);
      }

      if (arr.filter((x) => x.id === getter).length) {
        arr.filter((x) => x.id === getter)[0].commissionAmount =
          Math.abs(comDis);
        arr.filter((x) => x.id === getter)[0].commissionPercentage =
          currentCommission;
      } else {
        const inf = {
          id: getter,
          commission: 0,
          myComm,
          percent: sum - prevSum,
        };
        arr.push(inf);
      }
      prevMatchCom = mc;
      id = setterId;
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
    while (id !== "cc0001") {
      const data = await CommissionModel.findOne({ getter: id });
      if (!data) {
        throw new Error("No data found");
      }
      prevSum = sum;
      sum += parseFloat(data.matchShare);
      const am = amount;
      const getter = data.getter.toLowerCase(),
        setter = data.setter.toLowerCase();
      let dis = (am * data.matchShare) / 100;
      const mc = parseFloat(data.matchCommission);
      const currentCommission = mc - prevMatchCom;
      comSum += currentCommission;
      if (setter.toLowerCase() === "cc0001") {
        ccComAmount = (amount * (3 - comSum)) / 100;
        ccComPerc = 3 - comSum;
      }

      if (arr.filter((x) => x.id === setter.toLowerCase()).length) {
        arr.filter((x) => x.id === setter.toLowerCase())[0].commission = dis;
        arr.filter((x) => x.id === setter.toLowerCase())[0].percent =
          sum - prevSum;
      } else {
        const inf = {
          id: setter.toLowerCase(),
          commission: dis,
          percent: sum - prevSum,
        };
        arr.push(inf);
      }

      if (arr.filter((x) => x.id === getter).length) {
        arr.filter((x) => x.id === getter)[0].commissionPercentage =
          currentCommission;
      } else {
        const inf = {
          id: getter,
          commission: 0,
          percent: sum - prevSum,
        };
        arr.push(inf);
      }
      prevMatchCom = mc;
      id = setter;
    }
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
