const { getUserInformation } = require("../controllers/AuthController");
const clientCollection = async (matchId, username) => {
  const userRef = db
    .collection("betUserMap")
    .where("matchId", "==", matchId)
    .where("company", "==", username)
    .where("settled", "==", true);
  const userInfo = await getUserInformation(username);
  try {
    const value = await userRef.get();
    const arr = [];

    const data = value.docs.map((doc) => {
      const row = doc.data();
      const rate = row.priceValue > 1 ? row.priceValue : 1;
      const { myCom } = row;
      if (row.name === "sessionbet") {
        if (arr.some((x) => x.player === row.player)) {
          arr.filter((x) => x.player === row.player)[0].sessionStake +=
            row.stake * rate;
          if (row.won && row.won === true) {
            arr.filter((x) => x.player === row.player)[0].sessionSum +=
              row.lossAmount - myCom;
          } else {
            arr.filter((x) => x.player === row.player)[0].sessionSum -=
              row.profitAmount + myCom;
          }
        } else {
          var sessionSum = 0;
          const sessionStake = row.stake * rate;
          if (row.won && row.won === true) {
            sessionSum += row.lossAmount - myCom;
          } else {
            sessionSum -= row.profitAmount + myCom;
          }
          const inf = {
            player: row.player,
            sessionSum,
            sessionStake,
            adminShare: row.adminShare,
            pname: row.pname ? row.pname : "",
          };
          arr.push(inf);
        }
      } else if (row.name === "matchbet") {
        const { isBack } = row;
        const amount = isBack ? row.stake : (row.stake * row.priceValue) / 100;
        if (arr.some((x) => x.player === row.player)) {
          arr.filter((x) => x.player === row.player)[0].matchStake += amount;
          if (row.won && row.won === true) {
            arr.filter((x) => x.player === row.player)[0].matchSum -=
              row.lossAmount - row.lossCom;
          } else {
            arr.filter((x) => x.player === row.player)[0].matchSum +=
              row.profitAmount + row.profitCom;
          }
        } else {
          var matchSum = 0;
          const matchStake = amount;
          if (row.won) {
            matchSum -= row.lossAmount - row.lossCom;
          } else {
            matchSum += row.profitAmount + row.profitCom;
          }
          const inf = {
            player: row.player,
            matchSum,
            matchStake,
            adminShare: row.adminShare,
            pname: row.pname ? row.pname : "",
          };
          arr.push(inf);
        }
      }
    });
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
      const x = arr[i];
      const sessionSum = x.sessionSum ? round(x.sessionSum) : 0;
      const adminShare = x.adminShare ? round(x.adminShare) : 0;
      const matchStake = x.matchStake ? round(x.matchStake) : 0;
      const matchSum = x.matchSum ? round(x.matchSum) : 0;
      const sessionStake = x.sessionStake ? round(x.sessionStake) : 0;
      const totalSSum = (100 * sessionSum) / adminShare;
      const totalMSum = (100 * matchSum) / adminShare;
      var sCom = Math.abs((sessionStake * 3) / 100);
      var mCom = Math.abs((matchStake * 3) / 100);
      const total = totalMSum + totalSSum - mCom - sCom;
      const myShare = (total * parseInt(userInfo.matchShare)) / 100;
      const companyShare = total - myShare;
      sum += companyShare;
    }
    return { sum };
  } catch (error) {
    console.error(error);
    return 0;
  }
};

module.exports = clientCollection;
