const getApiData2 = require("./getApiData2");

const apiSwitch = async (matchId) => {
  // const response = await getApiData(matchId); //SSExchange
  const response = await getApiData2(matchId); //BabaExchange
  // const response = await getApiData3(matchId); //ICEExchange
  return response;
};
module.exports = apiSwitch;
