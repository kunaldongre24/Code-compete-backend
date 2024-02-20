const fs = require("fs");
const path = require("path");
const { generateFile } = require("../utils/generateFile");
const { executeCpp } = require("../utils/excecuteCpp");
const ProblemSet = require("../models/ProblemSet");
const { convert } = require("html-to-text");

const outputPath = path.join(__dirname, "../static/outputs");

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
    const { language = "cpp", code, problemId, contestId } = req.body;
    if (
      code === undefined ||
      problemId === undefined ||
      contestId === undefined
    ) {
      return res.send({ status: 0, msg: "Missing Parameters" });
    }
    const problem = await ProblemSet.findOne({ contestId, problemId });
    if (!problem) {
      return res.send({ status: 0, msg: "Problem not found" });
    }
    const filepath = await generateFile(language, code);
    try {
      const samples = problem.samples;
      let wrongCount = 0;
      const codeOutput = [];
      for (let sample of samples) {
        const input = convert(sample.input, options);
        let output = await executeCpp(filepath, input, problem.timeLimit);
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
      console.error(err);
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
      }
      res.json(response);
    } finally {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
  },
  async submitCode(req, res) {
    try {
      const { language = "cpp", code, problemId, contestId } = req.body;

      if (
        code === undefined ||
        problemId === undefined ||
        contestId === undefined
      ) {
        return res.send({ status: 0, msg: "Missing Parameters" });
      }
      const problem = await ProblemSet.findOne({ contestId, problemId });
      if (!problem) {
        return res.send({ status: 0, msg: "Problem not found" });
      }
      const filepath = await generateFile(language, code);
      const questionFolder =
        "../testcases/" + contestId + problemId.toUpperCase();
      const response = await checkTestCases(filepath, questionFolder, problem);
      console.log();
      res.status(201).json({ status: 1, response });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 0, msg: "Server Error" });
    }
  },
};

const checkTestCases = async (filepath, questionFolder, problem) => {
  const questionPath = path.join(__dirname, questionFolder);
  const questionDirectories = fs.readdirSync(questionPath, {
    withFileTypes: true,
  });
  let i = 0;
  for (const directory of questionDirectories) {
    i++;
    if (directory.isDirectory()) {
      const testCasePath = path.join(questionPath, directory.name);
      const inputPath = path.join(testCasePath, "input.txt");
      const outputPath = path.join(testCasePath, "output.txt");
      if (fs.existsSync(inputPath) && fs.existsSync(outputPath)) {
        const input = fs.readFileSync(inputPath, "utf-8");
        const expectedOutput = fs.readFileSync(outputPath, "utf-8");

        try {
          const output = await executeCpp(filepath, input, problem.timeLimit);
          const mdfOutput = output.replace(/\r/g, "");

          if (mdfOutput.trim() !== expectedOutput.trim()) {
            return { status: 0, msg: "Test case " + i + " failed", output };
          }
        } catch (error) {
          console.error(`Error executing test case ${directory.name}:`, error);
          return;
        } finally {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      } else {
        console.log("input or output file do not exist");
        return;
      }
    } else {
      console.log("directory not found");
      return;
    }
  }
};

module.exports = CompilerController;
