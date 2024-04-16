const { default: axios } = require("axios");
const checkPid = require("../helper/checkPid");
const saveTc = require("../helper/saveTc");
const CF_TC = require("../utils/CF_TC");
const scrapeProblemDetails = require("../utils/cf_scrapper");
const ProblemSet = require("../models/ProblemSet");
const RaceProblemSetMap = require("../models/RaceProblemSetMap");
const Race = require("../models/Race");
const fs = require("fs");
const RaceUserProblemsetMap = require("../models/RaceUserProblemsetMap");
const Tags = require("../models/Tags");

const ProblemSetController = {
  async fetchTestCases(cid, pid) {
    try {
      const pvcodes = new CF_TC();
      pid = checkPid(pid);
      pvcodes
        .get_testcases(cid, pid)
        .then((response) => {
          console.log(response[1].length);
          return true;
        })
        .catch((err) => {
          console.error(err);
          return false;
        });
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  async fetchProblems2(req, res) {
    try {
      const response = await axios.get(
        `https://codeforces.com/api/problemset.problems`
      );
      const resp = response.data.result.problems;
      const problems = resp.filter(
        (x) => x.rating && !x.tags.includes("interactive")
      );

      for (const problem of problems) {
        const { name, tags, rating, contestId, index } = problem;
        const problemExists = await ProblemSet.findOne({
          uniqueId: `${contestId}-${index}`,
        });

        if (problemExists) {
          console.log("Problem already exists:", name);
          continue;
        }

        if (rating === undefined) {
          console.log("Skipping problem with undefined rating:", name);
          continue;
        }

        const output = await scrapeProblemDetails(contestId, index);
        if (!output.status) {
          console.error("Error scraping problem details for:", name);
          continue;
        }

        const {
          timeLimit,
          memoryLimit,
          description,
          input_specification,
          output_specification,
          samples,
          note,
        } = output.problemDetails;
        const newProblemSet = new ProblemSet({
          title: name,
          timeLimit: timeLimit || "",
          memoryLimit: memoryLimit || "",
          uniqueId: `${contestId}-${index}`,
          contestId,
          problemId: index,
          description,
          input_specification,
          output_specification,
          samples,
          note,
          rating,
          tags,
        });
        const updated = await newProblemSet.save();

        if (updated) {
          const pvcodes = new CF_TC();
          const res = await pvcodes.get_testcases(contestId, index);

          if (!res[0]) {
            console.error("Test Cases not found for:", name, res[1]);
            continue;
          }

          await ProblemSet.findOneAndUpdate(
            { title: name },
            { testcases_count: res[1].length },
            { new: true }
          );

          const saveResp = saveTc(contestId, index, res[1]);
          if (saveResp) {
            console.log(
              `Fetched ${contestId}-${index}: ${name}. TC length: ${res[1].length}`
            );
          }
        } else {
          console.log("Error saving problem details for:", name);
        }
      }

      res.send("All the problems fetched to the system!");
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error!" });
    }
  },
  async fetchProblems3(req, res) {
    try {
      const response = await axios.get(
        `https://codeforces.com/api/problemset.problems`
      );
      const resp = response.data.result.problems;
      const problems = resp.filter(
        (x) => x.rating && !x.tags.includes("interactive")
      );

      for (let i = problems.length - 1; i >= 0; i--) {
        const problem = problems[i];
        const { name, tags, rating, contestId, index } = problem;
        const problemExists = await ProblemSet.findOne({
          uniqueId: `${contestId}-${index}`,
        });

        if (problemExists) {
          continue;
        }

        if (rating === undefined) {
          continue;
        }

        const pvcodes = new CF_TC();
        const res1 = await pvcodes.get_testcases(contestId, index);

        if (!res1[0]) {
          continue;
        }

        const saveResp = saveTc(contestId, index, res1[1]);
        if (saveResp) {
          const output = await scrapeProblemDetails(contestId, index);
          if (!output.status) {
            console.error("Error scraping problem details for:", name);
            continue;
          }

          const {
            timeLimit,
            memoryLimit,
            description,
            input_specification,
            output_specification,
            samples,
            note,
          } = output.problemDetails;
          const newProblemSet = new ProblemSet({
            title: name,
            timeLimit: timeLimit || "",
            memoryLimit: memoryLimit || "",
            uniqueId: `${contestId}-${index}`,
            contestId,
            problemId: index,
            description,
            input_specification,
            output_specification,
            samples,
            note,
            rating,
            tags,
          });
          const updated = await newProblemSet.save();
          await ProblemSet.findOneAndUpdate(
            { uniqueId: `${contestId}-${index}` },
            { testcases_count: res1[1].length },
            { new: true }
          );
          if (updated) {
            console.log(
              `Fetched ${contestId}-${index}: ${name}. TC length: ${res1[1].length}`
            );
          }
        }
      }

      res.send("All the problems fetched to the system!");
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error!" });
    }
  },
  async uploadTags(req, res) {
    try {
      const problems = await ProblemSet.find({});
      for (let i = 0; i < problems.length; i++) {
        const { tags, contestId, problemId, title } = problems[i];
        console.log(
          `${i + 1}.Uploading tags of ${contestId}-${problemId} ${title}`
        );
        for (let tag of tags) {
          await Tags.findOneAndUpdate(
            { name: tag },
            { upsert: true, new: true }
          );
        }
      }
      console.log("-------All tags uploaded successfully--------");
      res.send({ status: 1, msg: "Tags uploaded successfully!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error" });
    }
  },
  async getTags(req, res) {
    const tags = await Tags.find({});
    const tagNames = tags.map((x) => x.name);
    res.send({ status: 1, count: tags.length, tagNames });
  },
  countFolders(path) {
    try {
      const files = fs.readdirSync(path);
      let folderCount = 0;
      for (let i = 0; i < files.length; i++) {
        const stat = fs.statSync(path + "/" + files[i]);
        if (stat.isDirectory()) {
          folderCount++;
        }
      }
      return folderCount;
    } catch (err) {
      console.error("Error reading directory:", err);
      return -1; // Return -1 to indicate an error
    }
  },
  async countAndUpdate(req, res) {
    try {
      const problems = await ProblemSet.find({}); // Find all problems in the database
      for (let i = 0; i < problems.length; i++) {
        const folderName = `${problems[i].contestId}${problems[i].problemId}`; // Assuming uniqueId is the folder name
        const folderCount = ProblemSetController.countFolders(
          "/root/Code-compete-backend/testcases/" + folderName
        );

        // Update testcases_count for the current problem
        const filter = { _id: problems[i]._id };
        const update = { testcases_count: folderCount > 0 ? folderCount : 0 };
        await ProblemSet.findOneAndUpdate(filter, update);
        console.log(
          "Updated " + `${problems[i].contestId}${problems[i].problemId}`
        );
      }
      console.log("All testcases counts updated successfully");
      res.send({ msg: "All testcases count updated successfully!" });
    } catch (err) {
      console.error("Error updating testcases counts:", err);
    }
  },
  async getRaceProblemset(req, res) {
    try {
      const userId = req.user._id;
      const { raceId } = req.body;
      const race = await Race.findOne({ _id: raceId });
      if (!race) {
        return res.send({
          status: 0,
          code: "RACE_NOT_FOUND",
          msg: "Race not found",
        });
      }

      if (
        race.members.filter((x) => x.userId.toString() === userId.toString())
          .length === 0
      ) {
        return res.send({ status: 0, code: "You are not in race." });
      }
      let result = await RaceProblemSetMap.findOne({
        raceId: race._id,
      });
      if (!result) {
        return res.send({ status: 0 });
      }
      const raceUserProblemsetMap = await RaceUserProblemsetMap.findOne({
        raceId: race._id,
        userId,
        problemSetId: result.problemSetId,
      }).populate("problemSetId");
      const endTime = new Date(
        new Date(result.createdOn).getTime() +
          process.env.TIME_PER_PROBLEM * 60000
      );
      if (!raceUserProblemsetMap) {
        const newRaceUserProblemsetMap = new RaceUserProblemsetMap({
          raceId: race._id,
          problemSetId: result.problemSetId,
          userId,
          startingTime: result.createdOn,
        });
        await newRaceUserProblemsetMap.save();
        await newRaceUserProblemsetMap.populate("problemSetId");

        return res.send({
          status: 1,
          problem: newRaceUserProblemsetMap,
          currentTime: Date.now(),
          endTime,
        });
      } else {
        return res.send({
          status: 1,
          problem: raceUserProblemsetMap,
          currentTime: Date.now(),
          endTime,
        });
      }
    } catch (err) {
      console.error(err);
      res.send({
        status: 0,
        code: "SERVER_ERROR",
        msg: "Internal Server Error",
      });
    }
  },
  async deleteRating(req, res) {
    ProblemSet.deleteMany({ tags: { $in: ["interactive"] } }, (err, result) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`${result.deletedCount} documents deleted`);
    });
    res.send({ msg: "Deleted" });
  },
};
module.exports = ProblemSetController;
