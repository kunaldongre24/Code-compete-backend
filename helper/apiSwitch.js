// const getApiData1 = require("./getApiData");
// const getApiData2 = require("./getApiData2");
// const getApiData3 = require("./getApiData3");
const getApiData4 = require("./getApiData4");
// const getApiData6 = require("./getApiData6");

const apiSwitch = async (matchId) => {
  // const response = await getApiData1(matchId); //SSExchange
  // const response = await getApiData2(matchId); //BabaExchange
  // const response = await getApiData3(matchId); //ICEExchange
  const response = await getApiData4(matchId); //lc 1
  // const response = await getApiData6(matchId); //reddy
  return response;
};
module.exports = apiSwitch;
