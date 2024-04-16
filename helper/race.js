const Race = require("../models/Race");
const RaceProblemSetMap = require("../models/RaceProblemSetMap");
const RaceUserProblemsetMap = require("../models/RaceUserProblemsetMap");

const updateRaceUserProblemsetMap = async (
  code,
  pos,
  userId,
  raceId,
  problemSetId
) => {
  try {
    const race = await Race.findOne({ _id: raceId });
    if (!race) {
      return {};
    }
    const raceProblemSetMap = await RaceProblemSetMap.findOne({
      raceId,
      problemSetId,
    });
    if (!raceProblemSetMap) {
      return {};
    }
    const filter = { userId, raceId, problemSetId };
    const update = { code, pos };
    const options = { new: true, upsert: true };
    const updated = await RaceUserProblemsetMap.findOneAndUpdate(
      filter,
      update,
      options
    );
    return updated;
  } catch (error) {
    console.error(error);
    return {};
  }
};

const findRaceUserProblemsetMap = async (userId, raceId) => {
  try {
    const race = await Race.findOne({ _id: raceId });
    if (!race) {
      return {};
    }
    const raceUserProblemsetMap = await RaceUserProblemsetMap.findOne({
      userId,
      raceId: race._id,
      success: false,
      finished: false,
    });

    return raceUserProblemsetMap;
  } catch (err) {
    console.error(err);
    return {};
  }
};

module.exports = {
  updateRaceUserProblemsetMap,
  findRaceUserProblemsetMap,
};
