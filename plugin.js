const path = require("path");
const axios = require("axios");

module.exports = (on, config, fs) => {
  let makeRequest =
    require(path.join(config.projectRoot, "requestMockerUtil")) || null;

  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  const mocksFolder = path.resolve(config.fixturesFolder, "../mocks");

  //TODO :- Handle other methods
  const makeAPIRequest = async (service, method = "GET", params = {}) => {
    let response;
    try {
      response = await axios.get(service);
    } catch (error) {
      console.error(error);
    }
    return response;
  };

  //returns file content if file exists
  const readFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    return null;
  };

  const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return null;
  };

  const deleteFolder = (directoryPath) => {
    if (fs.existsSync(directoryPath)) {
      fs.readdirSync(directoryPath).forEach((file, index) => {
        const curPath = path.join(directoryPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          // recurse
          deleteFolder(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(directoryPath);
    }
  };

  const cleanMocks = () => {
    // TODO: create error handling
    const specFiles = fs.readdirSync(config.integrationFolder);
    const mockFiles = fs.readdirSync(mocksFolder);
    mockFiles.forEach((mockName) => {
      const isMockUsed = specFiles.find(
        (specName) => specName.split(".")[0] === mockName.split(".")[0]
      );
      if (!isMockUsed) {
        const mockData = readFile(path.join(mocksFolder, mockName));
        Object.keys(mockData).forEach((testName) => {
          mockData[testName].forEach((route) => {
            if (route.fixtureId) {
              deleteFile(
                path.join(config.fixturesFolder, `${route.fixtureId}.json`)
              );
            }
          });
        });

        deleteFile(path.join(mocksFolder, mockName));
      }
    });

    return null;
  };

  const removeAllMocks = () => {
    if (fs.existsSync(config.fixturesFolder)) {
      const fixtureFiles = fs.readdirSync(config.fixturesFolder);
      fixtureFiles.forEach((fileName) => {
        const file = path.join(config.fixturesFolder, fileName);
        if (fs.lstatSync(file).isDirectory()) {
          deleteFolder(file);
        } else {
          deleteFile(file);
        }
      });
    }

    if (fs.existsSync(mocksFolder)) {
      const mockFiles = fs.readdirSync(mocksFolder);
      mockFiles.forEach((fileName) => {
        deleteFile(path.join(mocksFolder, fileName));
      });
    }

    return null;
  };

  const createDirectoryIfNotExists = (dir_path) => {
    fs.mkdir(dir_path, { recursive: true }, (err) => {
      if (err) throw err;
    });
    return null;
  };

  const saveAPIresponse = async ({
    serviceURL,
    savedResponseFolder,
    harList,
    override_existing_response,
    useCustomMakeRequest,
  }) => {
    // console.log(serviceURL, savedResponseFolder, harList, override_existing_response, process.env.PWD);
    const harDir = path.join(savedResponseFolder, "hars");
    const apiDataDirectory = path.join(savedResponseFolder, "apiData");
    const apiStatusCodeFile = path.join(
      savedResponseFolder,
      "responseList.json"
    );

    if (!fs.existsSync(apiDataDirectory)) {
      fs.mkdirSync(apiDataDirectory);
    }

    let api_status_code = {};
    try {
      api_status_code = JSON.parse(fs.readFileSync(apiStatusCodeFile, "utf-8"));
    } catch (e) {
      fs.writeFileSync(apiStatusCodeFile, "{}");
    }

    let serviceList = new Set();

    for (const harName of harList) {
      const harFile = path.join(harDir, `${harName}.har`);
      const mockApiConfig = JSON.parse(fs.readFileSync(harFile, "utf-8"));

      const reqList = mockApiConfig.log.entries.map(
        (request) => request.request.url
      );
      const uniqueReqList = new Set(reqList.map((url) => url.split("&iid")[0]));
      uniqueReqList.forEach((url) => serviceList.add(url));
    }
    if (override_existing_response == false) {
      serviceList.forEach((url) => {
        const ns = url.replace(serviceURL, "").replace(/[^a-zA-Z0-9]/g, "_");
        if (ns in api_status_code) {
          serviceList.delete(url);
        }
      });
    }
    serviceList = Array.from(serviceList);
    makeRequest = (useCustomMakeRequest && makeRequest) || makeAPIRequest;
    //console.log('serviceList', serviceList, 'api_status_code', api_status_code);
    // console.log('makeRequest', makeRequest);

    const promises = serviceList.map(async (service) => {
      const ns = service.replace(serviceURL, "").replace(/[^a-zA-Z0-9]/g, "_");

      try {
        const response = await makeRequest(service);
        const api_data = response.data;
        api_status_code[ns] = response.status;

        const fileName = path.join(apiDataDirectory, `${ns}.json`);
        fs.writeFileSync(fileName, JSON.stringify(api_data));
      } catch (err) {
        console.log(err, "fail");
      }
    });

    await Promise.all(promises);

    fs.writeFileSync(apiStatusCodeFile, JSON.stringify(api_status_code));

    return null;
  };

  on("task", {
    saveAPIresponse,
    readFile,
    deleteFile,
    cleanMocks,
    removeAllMocks,
    createDirectoryIfNotExists,
  });
};
