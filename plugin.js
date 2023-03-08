const path = require("path");
const https = require("https");

module.exports = (on, config, fs) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  const mocksFolder = path.resolve(config.fixturesFolder, "../mocks");

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

  const saveAPIresponse = ({
    serviceURL,
    savedResponseFolder,
    harList,
    override_existing_response,
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

    const serviceList = new Set();

    for (const harName of harList) {
      const harFile = path.join(harDir, `${harName}.har`);
      const mockApiConfig = JSON.parse(fs.readFileSync(harFile, "utf-8"));

      const reqList = mockApiConfig.log.entries.map(
        (request) => request.request.url
      );
      const uniqueReqList = new Set(reqList.map((url) => url.split("&iid")[0]));
      uniqueReqList.forEach((url) => serviceList.add(url));
    }
    // console.log('serviceList', serviceList,'api_status_code',api_status_code);
    if (override_existing_response == false) {
      serviceList.forEach((url) => {
        const ns = url.replace(serviceURL, "").replace(/[^a-zA-Z0-9]/g, "_");
        if (ns in api_status_code) {
          serviceList.delete(url);
        }
      });
    }
    // console.log('serviceList', serviceList);

    for (const service of serviceList) {
      https
        .get(service, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            const ns = service
              .replace(serviceURL, "")
              .replace(/[^a-zA-Z0-9]/g, "_");
            let api_data = null;
            try {
              api_data = JSON.parse(body);
            } catch (e) {
              api_data = body;
              console.log(res, "fail");
            }

            const fileName = path.join(apiDataDirectory, `${ns}.json`);
            fs.writeFileSync(fileName, JSON.stringify(api_data));

            api_status_code[ns] = res.statusCode;

            fs.writeFileSync(
              apiStatusCodeFile,
              JSON.stringify(api_status_code)
            );
          });
        })
        .on("error", (err) => {
          console.error(`Error while making request: ${err.message}`);
        });
    }
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
