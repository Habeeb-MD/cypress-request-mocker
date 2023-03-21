const axios = require("axios");

const makeAPIRequest = async (service, method = "GET", params = {}) => {
  let response;
  try {
    response = await axios.get(service);
  } catch (error) {
    console.error(error);
  }
  const resp = {
    data: response.body || response.data,
    status: response.status,
  };
  return resp;
};

module.exports = makeAPIRequest;