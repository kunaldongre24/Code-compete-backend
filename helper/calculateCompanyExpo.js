const calculateCompanyExpo = async (bets, companyShare) => {
  let totalBalance = 0;
  const arr = [];
  await Promise.all(
    bets.map((row) => {
      const rate = row.priceValue > 1 ? row.priceValue : 1;
      if (row.name === "sessionbet") {
        if (arr.some((x) => x.player === row.player)) {
          arr.filter((x) => x.player === row.player)[0].sessionStake +=
            row.stake * rate;
          if (row.won && row.won === true) {
            var totalSSum =
              row.priceValue > 1 ? row.stake : row.stake * row.priceValue;
            arr.filter((x) => x.player === row.player)[0].sessionSum -=
              totalSSum;
          } else {
            var totalSSum =
              row.priceValue > 1 ? row.stake * row.priceValue : row.stake;
            arr.filter((x) => x.player === row.player)[0].sessionSum +=
              totalSSum;
          }
        } else {
          var sessionSum = 0;
          var matchStake = 0;
          var matchSum = 0;
          const sessionStake = row.stake * rate;
          if (row.won && row.won === true) {
            var totalSSum =
              row.priceValue > 1 ? row.stake : row.stake * row.priceValue;
            sessionSum -= totalSSum;
          } else {
            var totalSSum =
              row.priceValue > 1 ? row.stake * row.priceValue : row.stake;

            sessionSum += totalSSum;
          }
          const inf = {
            player: row.player,
            sessionSum,
            sessionStake,
            matchStake,
            matchSum,
            adminShare: row.adminShare,
            pname: row.pname ? row.pname : "",
          };
          arr.push(inf);
        }
      } else if (row.name === "matchbet" || row.name === "tossbet") {
        const { isBack } = row;
        const amount = isBack ? row.stake : (row.stake * row.odds) / 100;
        if (arr.some((x) => x.player === row.player)) {
          arr.filter((x) => x.player === row.player)[0].matchStake += amount;
          if (row.won && row.won === true) {
            var totalMSum = isBack ? (row.stake * row.odds) / 100 : row.stake;
            arr.filter((x) => x.player === row.player)[0].matchSum -= totalMSum;
          } else {
            var totalMSum = isBack ? row.stake : (row.stake * row.odds) / 100;
            arr.filter((x) => x.player === row.player)[0].matchSum += totalMSum;
          }
        } else {
          var matchSum = 0;
          var sessionStake = 0;
          var sessionSum = 0;
          const matchStake = amount;
          if (row.won) {
            var totalMSum = isBack ? (row.stake * row.odds) / 100 : row.stake;
            matchSum -= totalMSum;
          } else {
            var totalMSum = isBack ? row.stake : (row.stake * row.odds) / 100;
            matchSum += totalMSum;
          }
          const inf = {
            player: row.player,
            matchSum,
            sessionStake,
            sessionSum,
            matchStake,
            adminShare: row.adminShare,
            pname: row.pname ? row.pname : "",
          };
          arr.push(inf);
        }
      }
    })
  );
  arr.forEach((x) => {
    const matchSum = x.matchSum ? Math.round(x.matchSum * 100) / 100 : 0;
    const sessionSum = x.sessionSum ? Math.round(x.sessionSum * 100) / 100 : 0;
    const sessionStake = x.sessionStake
      ? Math.round(x.sessionStake * 100) / 100
      : 0;
    const total = matchSum + sessionSum;
    const mCom = matchSum > 0 ? (matchSum * 3) / 100 : 0;
    const sCom = (sessionStake * 3) / 100;
    const totalCom = sCom + mCom;
    const plusMinus = total - totalCom;

    totalBalance += (plusMinus * companyShare) / 100;
  });
  return totalBalance;
};
module.exports = calculateCompanyExpo;
