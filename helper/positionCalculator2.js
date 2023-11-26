function positionCalculator(matchBetData, resp) {
  let data = JSON.parse(JSON.stringify(resp));
  for (var i = 0; i < data.length; i++) {
    const teamOdds = data[i];

    for (var j = 0; j < matchBetData.length; j++) {
      const pos = matchBetData[j];
      const { isBack, stake, odds } = pos;
      if (teamOdds.runner === pos.selectionName) {
        if (!data[i].position) {
          data[i].position = 0;
        }
        if (isBack) {
          const val = parseFloat((odds * stake) / 100);
          data[i].position += val;
        } else {
          const val = parseFloat((odds * stake) / 100);
          data[i].position -= val;
        }
      } else {
        if (!data[i].position) {
          data[i].position = 0;
        }
        if (isBack) {
          const val = parseFloat(stake);
          data[i].position -= val;
        } else {
          const val = parseFloat(stake);
          data[i].position += val;
        }
      }
    }
  }
  return data;
}

module.exports = positionCalculator;
