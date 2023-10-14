const modifyFormat3 = (bm, fancy, marketTime) => {
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
    const isSuspended = item.rnrStatus !== "ACTIVE";
    const isBackSuspended =
      item.backBallRunning ||
      item.backRnrSuspended ||
      item.rnrBallRunning ||
      item.rnrSuspended ||
      isSuspended;
    const isLaySuspended =
      item.layBallRunning ||
      item.layRnrSuspended ||
      item.rnrBallRunning ||
      item.rnrSuspended ||
      isSuspended;
    let back1 = item.backOdds;
    let lay1 = item.layOdds;
    return {
      nat: item.runnerName,
      b1: isBackSuspended ? 0 : back1,
      bs1: 1000000,
      l1: isLaySuspended ? 0 : lay1,
      ls1: 1000000,
      s: item.rnrStatus,
      sr: item.sortPriority,
      updatetime: marketTime,
      sid: item.id,
    };
  };

  const bm1 = bm.map(mapMarketItem);

  const Fancymarket = fancy
    .filter((item) => !isExcluded(item.marketType))
    .map((item) => {
      const {
        rnrBallRunning,
        backBallRunning,
        backRnrSuspended,
        rnrSuspended,
        layBallRunning,
        layRnrSuspended,
      } = item.runners[0];
      const isSuspended =
        item.status !== "OPEN" ||
        item.ballRunning ||
        rnrBallRunning ||
        backBallRunning ||
        backRnrSuspended ||
        rnrSuspended ||
        layBallRunning ||
        layRnrSuspended;
      const gStatus =
        item.statusName === "OPEN" ? item.statusName : "Ball Running";
      return {
        sid: item.runners[0].selectionId,
        nat: item.marketType,
        b1: isSuspended
          ? 0
          : item.runners[0].backRuns
          ? item.runners[0].backRuns
          : 0,
        bs1: isSuspended
          ? 0
          : item.runners[0].backOdds
          ? item.runners[0].backOdds
          : 0,
        l1: isSuspended
          ? 0
          : item.runners[0].layRuns
          ? item.runners[0].layRuns
          : 0,
        ls1: isSuspended
          ? 0
          : item.runners[0].layOdds
          ? item.runners[0].layOdds
          : 0,
        gstatus: gStatus,
        srno: item.id,
        updatetime: marketTime,
      };
    });

  return {
    BMmarket: { bm1 },
    Fancymarket,
  };
};

module.exports = modifyFormat3;
