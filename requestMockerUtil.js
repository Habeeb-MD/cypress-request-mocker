const axios = require("axios");

const makeAPIRequest = async (service, method = "GET", params = {}) => {
  let response;
  try {
    response = await axios.get(service);
  } catch (error) {
    console.error(error);
  }
  return response;
};

module.exports = makeAPIRequest;