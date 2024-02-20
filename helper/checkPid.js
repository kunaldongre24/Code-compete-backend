function checkPid(pid) {
  if (!isNaN(pid)) {
    pid = "A" + (parseInt(pid) - 1);
  } else {
    pid = pid.toUpperCase();
  }
  return pid;
}
module.exports = checkPid;
