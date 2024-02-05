const ballRunMap = {
  wb: 1,
  nb: 1,
  w: 0,
  lb: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
};

function calculateRun(currentValue) {
  const stringWithoutNumbers = currentValue.replace(/\d/g, "");
  const stringWithoutChar = currentValue.replace(/\D/g, "");

  const key = stringWithoutNumbers.toLowerCase();
  const baseValue = ballRunMap[key] || 0;
  const additionalRuns = parseInt(stringWithoutChar, 10) || 0;

  return baseValue + additionalRuns;
}
module.exports = calculateRun;
