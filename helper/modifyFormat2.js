const modifyFormat2 = (bm, fancy, marketTime, bookmakerStatus) => {
  const isExcluded = (marketName) => {
    const keywordsToExclude = [
      "even",
      "odd",
      "to",
      "caught",
      "face",
      "highest",
      "playing",
      "favourite",
      "lunch",
      "total",
      "method",
      "bhav",
    ];
    const lowerCaseMarketName = marketName.toLowerCase();
    return keywordsToExclude.some((keyword) =>
      lowerCaseMarketName.includes(keyword)
    );
  };
  const mapMarketItem = (item) => {
    const isSuspended =
      item.status !== "OPEN" || bookmakerStatus !== "OPEN" || item.suspended;
    const back = item.backPrices[0].price;
    const lay = item.layPrices[0].price;
    let back1 = back;
    let lay1 = lay;
    return {
      nat: item.runnerName.trim(),
      b1: isSuspended ? 0 : back1,
      bs1: 1000000,
      l1: isSuspended ? 0 : lay1,
      ls1: 1000000,
      s: item.status,
      sr: item.sort,
      updatetime: marketTime,
      sid: item.runnerId,
    };
  };

  const bm1 = bm.map(mapMarketItem);

  const Fancymarket = Array.isArray(fancy)
    ? fancy
        .filter((item) => !isExcluded(item.marketName))
        .map((item) => {
          const isSuspended =
            item.status !== "ACTIVE" ||
            item.suspended ||
            item.categorySuspended;
          const gStatus =
            item.status === "SUSPEND"
              ? "Suspended"
              : item.statusName === "ACTIVE"
              ? item.statusName
              : "Ball Running";
          return {
            sid: item.marketId,
            nat: item.marketName,
            b1: isSuspended ? 0 : item.yesValue,
            bs1: isSuspended ? 0 : item.yesRate,
            l1: isSuspended ? 0 : item.noValue,
            ls1: isSuspended ? 0 : item.noRate,
            gstatus: gStatus,
            srno: item.marketId,
            updatetime: marketTime,
          };
        })
    : [];

  return {
    BMmarket: { bm1 },
    Fancymarket,
  };
};

module.exports = modifyFormat2;
