const fs = require("fs");

function saveTc(cid, pid, tc) {
  try {
    const pth = `testcases/${cid}${pid}`;

    // Make a dir for that problem
    if (!fs.existsSync(pth)) {
      fs.mkdirSync(pth, { recursive: true });
    }

    // Save all TCs in separate files
    const n = tc.length;
    for (let i = 0; i < n; i++) {
      const tcPath = `${pth}/tc${i + 1}`;
      if (!fs.existsSync(tcPath)) {
        fs.mkdirSync(tcPath, { recursive: true });
      }
      fs.writeFileSync(`${tcPath}/input.txt`, tc[i][0]);
      fs.writeFileSync(`${tcPath}/output.txt`, tc[i][1]);
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

module.exports = saveTc;
