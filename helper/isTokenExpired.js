function isTokenExpired(tokenPayload) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return tokenPayload.exp && tokenPayload.exp <= currentTimestamp;
}
module.exports = isTokenExpired;
