function getCurrentIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset from UTC in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  return istTime;
}
module.exports = getCurrentIST;
