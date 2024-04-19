const fs = require("fs");
const path = require("path");
const { generateFile } = require("../utils/generateFile");
const { compileCpp, runExecutable } = require("../utils/executeCpp");
const ProblemSet = require("../models/ProblemSet");
const { convert } = require("html-to-text");
const RaceUserProblemsetMap = require("../models/RaceUserProblemsetMap");
const Race = require("../models/Race");

const outputPath = path.join(__dirname, "../static/outputs");
const MAX_STDERR_LENGTH = 1000;
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}
const options = {
  wordwrap: null,
};
const CompilerController = {
  containsHtmlTags(str) {
    const regex = /<[^>]+>/;
    return regex.test(str);
  },
  compareOutputs(output1, output2, precision = 6) {
    const round = (num) => {
      const parsedNum = parseFloat(num);
      return isNaN(parsedNum) ? num : parsedNum.toFixed(precision);
    };

    const splitOutput1 = output1.split(/\s+/); // Split by any whitespace
    const splitOutput2 = output2.split(/\s+/); // Split by any whitespace

    // Ensure both outputs have the same number of elements
    const maxLength = Math.max(splitOutput1.length, splitOutput2.length);
    const paddedOutput1 = splitOutput1.concat(
      Array(maxLength - splitOutput1.length).fill("0")
    );
    const paddedOutput2 = splitOutput2.concat(
      Array(maxLength - splitOutput2.length).fill("0")
    );

    const roundOutput1 = paddedOutput1.map(round).join(" ");
    const roundOutput2 = paddedOutput2.map(round).join(" ");
    return roundOutput1 === roundOutput2;
  },
  roundOutput(data, precision = 6) {
    return data.map((item) => {
      const round = (num) => {
        const parsedNum = parseFloat(num);
        return isNaN(parsedNum) ? num : parsedNum.toFixed(precision);
      };

      const code = item.code;

      const output = item.output.split("\n").map(round).join("\n");

      const expectedOutput = item.expectedOutput
        .split("\n")
        .map(round)
        .join("\n");

      return { ...item, code, output, expectedOutput };
    });
  },
  async run(req, res) {
    const { language = "cpp", code, problemSetId } = req.body;
    if (code === undefined || problemSetId === undefined) {
      return res.send({ status: 0, msg: "Missing Parameters" });
    }
    const problem = await ProblemSet.findById(problemSetId);
    if (!problem) {
      return res.send({ status: 0, msg: "Problem not found" });
    }
    const filepath = await generateFile(language, code);
    let executablePath;
    try {
      executablePath = await compileCpp(filepath);
      const samples = problem.samples;
      let wrongCount = 0;
      const codeOutput = [];
      for (let sample of samples) {
        const input = convert(sample.input, options);
        let output = await runExecutable(
          executablePath,
          input,
          problem.timeLimit,
          problem.memoryLimit
        );
        output = output.replace(/\r/g, "");
        const mdfOutput = convert(output, options);
        let expectedOutput;
        if (CompilerController.containsHtmlTags(sample.output)) {
          expectedOutput = convert(sample.output, options);
        } else {
          expectedOutput = sample.output.replace(/<[^>]+>/g, "");
        }
        const expectedOutputCheck = convert(sample.output, options);
        const isEqual = CompilerController.compareOutputs(
          mdfOutput.trim(),
          expectedOutputCheck.trim(),
          3
        );
        if (!isEqual) {
          wrongCount++;
        }
        if (output.length > MAX_STDERR_LENGTH) {
          output =
            output.substring(0, MAX_STDERR_LENGTH) +
            `... ${output.length - MAX_STDERR_LENGTH} more chars`;
        }
        codeOutput.push({
          input: sample.input,
          output: output.trim(),
          expectedOutput: expectedOutput.trim(),
        });
      }
      const status = wrongCount === 0;
      const msg = status ? "Test Cases Passed!" : "Test Cases failed!";
      res.status(201).json({
        status: status ? 1 : 0,
        msg,
        response: codeOutput,
      });
    } catch (err) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      const response = { status: 0, response: [] };
      if (err.stderr) {
        const lines = err.stderr.split("\n").map((line) => {
          const match = line.match(/(\d+):(\d+): (.+)/);
          if (match) {
            const [, lineNum, charNum, message] = match;
            return `Line ${lineNum}: Char ${charNum}: ${message}`;
          }
          return line;
        });
        lines.shift();
        const modifiedStderr = lines.join("\n");
        response.msg = "Compilation failed.";
        response.stderr = modifiedStderr;

        if (err.stderr === "tle") {
          response.stderr = "Time Limit Exceed";
          response.msg = "Time Limit Exceed.";
        } else if (err.stderr === "mle") {
          response.stderr = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
          response.msg = "Memory Limit Exceed.";
        }
      }
      res.json(response);
    } finally {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      if (fs.existsSync(executablePath)) {
        fs.unlinkSync(executablePath);
      }
    }
  },
  async submitCode(req, res) {
    const { language = "cpp", code, problemSetId, raceId } = req.body;
    try {
      const userId = req.user._id;
      const solveTime = Date.now();
      if (
        code === undefined ||
        problemSetId === undefined ||
        raceId === undefined
      ) {
        return res.send({ status: 0, msg: "Missing Parameters", code });
      }
      const raceUserProblemsetMap = await RaceUserProblemsetMap.findOne({
        raceId,
        problemSetId,
        userId,
      });
      if (!raceUserProblemsetMap) {
        return res.send({ status: 0, msg: "No race found.", code });
      }
      const problem = await ProblemSet.findById(problemSetId);
      if (!problem) {
        return res.send({ status: 0, msg: "Problem not found", code });
      }
      const { contestId, problemId } = problem;
      const filepath = await generateFile(language, code);
      const questionFolder =
        "../testcases/" + contestId + problemId.toUpperCase();
      const response = await checkTestCases(filepath, questionFolder, problem);
      if (response && response.status) {
        const solvingTime =
          solveTime - new Date(raceUserProblemsetMap.startingTime).getTime();
        await RaceUserProblemsetMap.findOneAndUpdate(
          {
            raceId,
            problemSetId,
            userId,
          },
          { solved: true, solveTimeMs: solvingTime },
          { new: true, upsert: true }
        );
        const members = await RaceUserProblemsetMap.find({
          raceId,
        })
          .sort({ solveTimeMs: 1 })
          .select("solveTimeMs solved userId _id")
          .populate("userId");
        const io = req.app.get("socket");
        if (members.filter((member) => !member.solved).length === 0) {
          await Race.findByIdAndUpdate(raceId, {
            finished: true,
          });
          io.to(raceId.toString()).emit("problemFinished");
        }
        io.in(raceId.toString()).emit("leaderboard", members);
        return res.json({ status: 1, msg: "All test cases passed!", code });
      } else {
        response.code = code;
        return res.send(response);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 0, msg: "Server Error", code });
    }
  },
};

const checkTestCases = async (filepath, questionFolder, problem) => {
  const questionPath = path.join(__dirname, questionFolder);
  const questionDirectories = fs.readdirSync(questionPath, {
    withFileTypes: true,
  });

  // Compile the C++ code
  let executablePath;
  try {
    executablePath = await compileCpp(filepath);
  } catch (err) {
    if (fs.existsSync(executablePath)) {
      fs.unlinkSync(executablePath);
    }
    if (err.stderr) {
      let msg = "Some error occurred!";
      let stderr;
      const lines = err.stderr.split("\n").map((line) => {
        const match = line.match(/(\d+):(\d+): (.+)/);
        if (match) {
          const [, lineNum, charNum, message] = match;
          return `Line ${lineNum}: Char ${charNum}: ${message}`;
        }
        return line;
      });
      lines.shift();
      const modifiedStderr = lines.join("\n");
      msg = "Compilation failed.";
      stderr = modifiedStderr;
      if (err.stderr === "tle") {
        stderr = "Time Limit Exceed";
        msg = "Time Limit Exceed.";
      } else if (err.stderr === "mle") {
        stderr = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
        msg = "Memory Limit Exceed.";
      }
      return { status: 0, msg, stderr };
    }
    return { status: 0, msg: "Execution Failed!" };
  }

  for (let i = 0; i < questionDirectories.length; i++) {
    const directory = questionDirectories[i];
    if (directory.isDirectory()) {
      const testCasePath = path.join(questionPath, directory.name);
      const inputPath = path.join(testCasePath, "input.txt");
      const outputPath = path.join(testCasePath, "output.txt");
      if (fs.existsSync(inputPath) && fs.existsSync(outputPath)) {
        const input = fs.readFileSync(inputPath, "utf-8");
        const expectedOutput = fs.readFileSync(outputPath, "utf-8");
        try {
          let output = await runExecutable(
            executablePath,
            input,
            problem.timeLimit,
            problem.memoryLimit
          );
          output = output.replace(/\r/g, "");
          const mdfOutput = convert(output, options);
          const expectedOutputCheck = convert(expectedOutput, options);
          const isEqual = CompilerController.compareOutputs(
            mdfOutput.trim(),
            expectedOutputCheck.trim(),
            3
          );
          if (!isEqual) {
            return {
              status: 0,
              msg: "Test case " + (i + 1) + " failed",
            };
          }
        } catch (err) {
          if (err.stderr) {
            console.log(err);
            let msg = "Some error occurred!";
            let stderr;
            const lines = err.stderr.split("\n").map((line) => {
              const match = line.match(/(\d+):(\d+): (.+)/);
              if (match) {
                const [, lineNum, charNum, message] = match;
                return `Line ${lineNum}: Char ${charNum}: ${message}`;
              }
              return line;
            });
            lines.shift();
            const modifiedStderr = lines.join("\n");
            msg = "Compilation failed.";
            stderr = modifiedStderr;

            if (err.stderr === "tle") {
              stderr = "Time Limit Exceed";
              msg = "Time Limit Exceed.";
            } else if (err.stderr === "mle") {
              stderr = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
              msg = "Memory Limit Exceed.";
            }
            return { status: 0, msg, stderr };
          }
          return { status: 0, msg: "Execution Failed!" };
        }
      } else {
        console.error("input or output file do not exist");
        return {
          status: 0,
          msg: "Input or output file do not exist",
        };
      }
    } else {
      console.error("directory not found");
      return { status: 0, msg: "Directory not found" };
    }
  }

  if (fs.existsSync(executablePath)) {
    fs.unlinkSync(executablePath);
  }
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }

  return { status: 1, msg: "All test cases passed" };
};

module.exports = CompilerController;
