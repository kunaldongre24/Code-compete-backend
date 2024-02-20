const { default: axios } = require("axios");
const checkPid = require("../helper/checkPID");
const saveTc = require("../helper/saveTc");
const CF_TC = require("../utils/CF_TC");
const scrapeProblemDetails = require("../utils/cf_scrapper");
const ProblemSet = require("../models/ProblemSet");

const RoomController = {
  async fetchProblems(req, res) {
    try {
      for (let i = 2800; i <= 3500; i += 100) {
        const response = await axios.get(
          `https://c2-ladders-juol.onrender.com/api/ladder?startRating=${i}&endRating=${
            i + 100
          }`
        );
        console.log("Fetching problem list of rating: " + i);
        const { data } = response.data;
        for (let j = 0; j < data.length; j++) {
          const row = data[j];
          const { name, tags, rating, contestId, index } = row;
          console.log(`Fetching problem ${contestId}-${index}: ${name}`);

          const output = await scrapeProblemDetails(contestId, index);
          if (output.status) {
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
              timeLimit: timeLimit ? timeLimit : "",
              memoryLimit: memoryLimit ? memoryLimit : "",
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
                console.error("Test Cases not found " + res[1]);
                continue;
              }
              await ProblemSet.findOneAndUpdate(
                { title: name },
                { testcases_count: res[1].length },
                {
                  new: true,
                }
              );
              console.log(
                `Successfully fetched ${res[1].length} testcases, saving them as files!`
              );

              const saveResp = saveTc(contestId, index, res[1]);
              if (saveResp) {
                console.log(
                  `Successfully scrapped and save problem ${contestId}-${index}: ${name}`
                );
              }
            } else {
              console.log("error2");
              break;
            }
          } else {
            console.log("Error scrapping Problem Statements");
            break;
          }
        }
      }

      res.send("All the problems fetched to the system!");
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "Internal Server Error!" });
    }
  },
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
  async getProblem(req, res) {
    const problemSets = await ProblemSet.aggregate([{ $sample: { size: 1 } }]);
    res.send(problemSets);
  },
  async deleteRating(req, res) {
    const { rating } = req.params;
    const problemSets = await ProblemSet.deleteMany({ rating });
    res.send({ msg: "Deleted" });
  },
};
module.exports = RoomController;
