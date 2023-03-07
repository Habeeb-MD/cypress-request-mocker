const path = require("path");
const spawn = require("child_process").spawn;

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

  //this is saving API response (it will not override existing response, usually it is preferred to avoid duplicate API calls and save time)
  const saveAPIresponse = ({ serviceURL, savedResponseFolder, harList }) => {
    // console.log(serviceURL, savedResponseFolder, harList);
    const override_existing_response = "false";
    spawn("python", [
      "save_api_response.py",
      serviceURL,
      savedResponseFolder,
      harList,
      override_existing_response,
    ]);
    return null;
  };

  //this is also for saving API response (it will override any existing response)
  const updateAPIresponse = ({ serviceURL, savedResponseFolder, harList }) => {
    console.log("updateAPIresponse", serviceURL, savedResponseFolder, harList);
    const override_existing_response = "true";
    spawn("python", [
      "save_api_response.py",
      serviceURL,
      savedResponseFolder,
      harList,
      override_existing_response,
    ]);
    return null;
  };

  on("task", {
    saveAPIresponse,
    updateAPIresponse,
    readFile,
    deleteFile,
    cleanMocks,
    removeAllMocks,
    createDirectoryIfNotExists,
  });
};
