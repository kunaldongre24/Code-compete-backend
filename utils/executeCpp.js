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
const runExecutable = (executablePath, inputString, timeLimit, memoryLimit) => {
  const timeout = timeLimit * 1000;
  const maxBuffer = memoryLimit * 1024 * 1024;
  const execOptions = {
    timeout,
    maxBuffer,
    resourceLimits: {
      maxOldGenerationSizeMb: memoryLimit, // Set the maximum size of old-generation memory in megabytes
    },
  };

  return new Promise((resolve, reject) => {
    const childProcess = exec(
      executablePath,
      execOptions,
      (error, stdout, stderr) => {
        if (error) {
          if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
            reject({ error, msg: "Memory Limit Exceeded", stderr: "mle" });
          }
          if (error.killed) {
            reject({ error, msg: "Time Limit Exceeded", stderr: "tle" });
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
  });
};

const executeCpp = async (filepath, inputString, timeLimit, memoryLimit) => {
  try {
    const executablePath = await compileCpp(filepath);
    const result = await runExecutable(
      executablePath,
      inputString,
      timeLimit,
      memoryLimit
    );
    return result;
  } catch (error) {
    console.error(error);
    throw { stderr: error.stderr || undefined };
  }
};

module.exports = {
  executeCpp,
  compileCpp,
  runExecutable,
};
