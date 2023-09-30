const modifyFormat = (bm, fancy) => {
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
  const mapMarketItem = (item, i) => {
    const isSuspended = item.selectionStatus !== "ACTIVE";
    const back1 = Math.round((item.backOdds - 1) * 10000) / 100;
    const lay1 = Math.round((item.layOdds - 1) * 10000) / 100;
    return {
      nat: item.selectionName,
      b1: isSuspended ? 0 : back1,
      bs1: 1000000,
      l1: isSuspended ? 0 : lay1,
      ls1: 1000000,
      s: item.selectionStatus,
      sr: item.sortingOrder,
      updatetime: item.marketTime,
      sid: i,
    };
  };

  const bm1 = bm.map(mapMarketItem);

  const Fancymarket = fancy
    .filter((item) => !isExcluded(item.marketName))
    .map((item) => {
      const isSuspended = item.statusName !== "ACTIVE";

      return {
        sid: item.marketId,
        nat: item.marketName,
        b1: isSuspended ? 0 : item.runsYes,
        bs1: isSuspended ? 0 : item.oddsYes,
        l1: isSuspended ? 0 : item.runsNo,
        ls1: isSuspended ? 0 : item.oddsNo,
        gstatus: item.statusName,
        srno: item.sortingOrder,
        updatetime: item.marketTime,
      };
    });

  return {
    BMmarket: { bm1 },
    Fancymarket,
  };
};

module.exports = modifyFormat;
