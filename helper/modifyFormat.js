const modifyFormat = (mid, runner, matchOdds, sessionOdds) => {
  const t1 = runner.map((item) => {
    return {
      sid: item.selectionId,
      nat: item.runnerName,
      sr: item.sortPriority,
    };
  });
  const bm1 = matchOdds[0].runners;
  sessionOdds = sessionOdds.filter((x) => x.gtype === "session");
  const t3 = sessionOdds.map((item) => {
    return {
      mid,
      nat: item.RunnerName,
      b1: item.BackPrice1,
      l1: item.LayPrice1,
      bs1: item.BackSize1,
      ls1: item.LaySize1,
      srno: item.sr_no,
      gtype: "Fancy",
      gstatus: item.GameStatus,
      remark: item.rem,
      sid: item.SelectionId,
      ballsess: item.ballsess,
    };
  });
  const format = {
    success: true,
    data: { t1, t2: [{ bm1, bm2: [] }], t3, t4: null },
  };
  return format;
};
module.exports = modifyFormat;
