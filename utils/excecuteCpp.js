const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "../static/outputs");

if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

const compileCpp = (filepath) => {
  return new Promise((resolve, reject) => {
    const jobId = path.basename(filepath).split(".")[0];
    const outPath = path.join(outputPath, `${jobId}.out`);
    exec(`g++ ${filepath} -o ${outPath}`, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(outPath);
      }
    });
  });
};

const runExecutable = (executablePath, inputString, timeLimit) => {
  const timeout = timeLimit * 1000;
  return new Promise((resolve, reject) => {
    const childProcess = exec(
      executablePath,
      { timeout },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject({ error, msg: "Time Limit Exceeded" });
          } else {
            reject({ error, stderr });
          }
        } else {
          resolve(stdout);
        }
      }
    );

    childProcess.stdin.on("error", (err) => {
      reject(err);
    });

    if (inputString) {
      childProcess.stdin.write(inputString + "\n", (err) => {
        if (err) {
          reject(err);
        }
      });
    }

    childProcess.stdin.end();

    childProcess.on("exit", () => {
      if (fs.existsSync(executablePath)) {
        fs.unlink(executablePath, (err) => {
          if (err) {
            console.error("Error deleting executable file:", err);
          }
        });
      } else {
        console.log("Executable file not found");
      }
    });
  });
};

const executeCpp = async (filepath, inputString, timeLimit) => {
  try {
    const executablePath = await compileCpp(filepath);
    const result = await runExecutable(executablePath, inputString, timeLimit);
    return result;
  } catch (error) {
    throw { stderr: error.stderr || undefined };
  }
};

module.exports = {
  executeCpp,
};
