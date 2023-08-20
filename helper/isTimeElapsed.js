function isTimeElapsed(timestamp) {
  const currentTime = Date.now();
  const elapsedTime = currentTime - timestamp;
  const oneHourInMilliseconds = 3600000; // 1 hour = 3600000 milliseconds

  return elapsedTime >= oneHourInMilliseconds;
}
module.exports = isTimeElapsed;
