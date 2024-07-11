const path = require("path");
const fs = require("fs");
const axios = require("axios");
const {
  install,
  ensureBrowserFlags,
} = require("@neuralegion/cypress-har-generator");

module.exports = (on, config) => {
  let makeRequest = null;

  try {
    makeRequest =
      require(path.join(config.projectRoot, "requestMockerUtil")) || null;
  } catch (error) {
    console.log("The module could not be loaded:", error.message);
  }

  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  const mocksFolder = path.resolve(config.fixturesFolder, "../mocks");

  //TODO :- Handle other methods
  const makeApiRequest = async (service, method = "GET", params = {}) => {
    let response;
    try {
      response = await axios.get(service);
      return {
        data: response.data || response.body,
        status: response.status,
      };
    } catch (error) {
      console.log(
        `Error occurred while fetching data for service ${service}.
        \nPossible reason :- \n1)API endpoint is not working atm.
        \n2)Request needs some special auth/headers :- try to use Custom Make Request`,
      );
      console.log(error.toJSON());
      return {
        data: undefined,
        status: error.status,
      };
    }
  };

  //returns file content if file exists
  const readFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    return null;
  };

  const deleteFile = async (filePath) => {
    if (await fs.promises.exists(filePath)) return fs.promises.unlink(filePath);
    return null;
  };

  const deleteDirectory = async (directoryPath) => {
    try {
      const stat = await fs.promises.stat(directoryPath);
      if (!stat.isDirectory()) {
        throw new Error(`${directoryPath} is not a directory`);
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        return; // Directory does not exist, nothing to delete
      }
      throw err; // Rethrow other errors
    }

    const files = await fs.promises.readdir(directoryPath);
    await Promise.all(
      files.map(async (file) => {
        const curPath = path.join(directoryPath, file);
        const stat = await fs.promises.lstat(curPath);
        if (stat.isDirectory()) {
          await deleteDirectory(curPath);
        } else {
          await fs.promises.unlink(curPath);
        }
      }),
    );

    await fs.promises.rmdir(directoryPath);
    return null;
  };

  const cleanMocks = async () => {
    try {
      const specFiles = await fs.promises.readdir(config.integrationFolder);
      const mockFiles = await fs.promises.readdir(mocksFolder);

      await Promise.all(
        mockFiles.map(async (mockName) => {
          const isMockUsed = specFiles.find(
            (specName) => specName.split(".")[0] === mockName.split(".")[0],
          );

          if (!isMockUsed) {
            const mockData = await readFile(path.join(mocksFolder, mockName));
            await Promise.all(
              Object.keys(mockData).map(async (testName) => {
                await Promise.all(
                  mockData[testName].map(async (route) => {
                    if (route.fixtureId) {
                      await deleteFile(
                        path.join(
                          config.fixturesFolder,
                          `${route.fixtureId}.json`,
                        ),
                      );
                    }
                  }),
                );
              }),
            );

            await deleteFile(path.join(mocksFolder, mockName));
          }
        }),
      );

      return null;
    } catch (error) {
      console.error("Error cleaning mocks:", error);
      throw error;
    }
  };

  const removeAllMocks = async () => {
    try {
      if (await fs.promises.stat(config.fixturesFolder).catch(() => false)) {
        const fixtureFiles = await fs.promises.readdir(config.fixturesFolder);
        await Promise.all(
          fixtureFiles.map(async (fileName) => {
            const file = path.join(config.fixturesFolder, fileName);
            const stat = await fs.promises.lstat(file);
            if (stat.isDirectory()) {
              await deleteDirectory(file);
            } else {
              await deleteFile(file);
            }
          }),
        );
      }

      if (await fs.promises.stat(mocksFolder).catch(() => false)) {
        const mockFiles = await fs.promises.readdir(mocksFolder);
        await Promise.all(
          mockFiles.map(async (fileName) => {
            await deleteFile(path.join(mocksFolder, fileName));
          }),
        );
      }
      return true;
    } catch (error) {
      console.error("Error removing all mocks:", error);
      throw error;
    }
  };

  const createDirectoryIfNotExists = async (dirPath) => {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return null;
    } catch (error) {
      console.error("Error creating directory:", error);
      throw error;
    }
  };

  const createFileIfNotExists = async (filePath, defaultContent = "{}") => {
    //return true if new file is created otherwise false
    try {
      // try to read file
      await fs.promises.readFile(filePath);
      return false;
    } catch (error) {
      // create a new file, because it wasn't found
      await fs.promises.writeFile(filePath, defaultContent);
      return true;
    }
  };

  const saveApiResponse = async ({
    serviceURL,
    savedResponseFolder,
    harList,
    overrideExistingResponse,
    useCustomMakeRequest,
  }) => {
    // console.log(serviceURL, savedResponseFolder, harList, overrideExistingResponse, process.env.PWD);
    try {
      const harDir = path.join(savedResponseFolder, "hars");

      const apiDataDirectory = path.join(savedResponseFolder, "apiData");

      const apiStatusCodeFile = path.join(
        savedResponseFolder,
        "responseList.json",
      );

      await createDirectoryIfNotExists(apiDataDirectory);
      await createFileIfNotExists(apiStatusCodeFile);

      const apiStatusCode = JSON.parse(
        await fs.promises.readFile(apiStatusCodeFile, "utf-8"),
      );
      let serviceList = [];

      await Promise.all(
        harList.map(async (harName) => {
          const harFile = path.join(harDir, `${harName}.har`);
          const mockApiConfig = JSON.parse(
            await fs.promises.readFile(harFile, "utf-8"),
          );
          const reqList = mockApiConfig.log.entries.map(
            (request) => request.request.url,
          );
          const uniqueReqList = new Set(
            reqList.map((url) => url.split("&iid")[0]),
          );
          serviceList = serviceList.concat(...uniqueReqList);
        }),
      );

      if (overrideExistingResponse === false) {
        serviceList = Array.from(new Set(serviceList)).filter((url) => {
          return !(
            url.replace(serviceURL, "").replace(/[^a-zA-Z0-9]/g, "_") in
            apiStatusCode
          );
        });
      }

      makeRequest = (useCustomMakeRequest && makeRequest) || makeApiRequest;
      //console.log('serviceList', serviceList, 'apiStatusCode', apiStatusCode);
      // console.log('makeRequest', makeRequest);

      await Promise.all(
        serviceList.map(async (service) => {
          const ns = service
            .replace(serviceURL, "")
            .replace(/[^a-zA-Z0-9]/g, "_");

          const response = await makeRequest(service);
          const api_data = response?.data;
          apiStatusCode[ns] = response?.status;

          const fileName = path.join(apiDataDirectory, `${ns}.json`);
          return await createFileIfNotExists(
            fileName,
            JSON.stringify(api_data),
          );
        }),
      );
      await fs.promises.writeFile(
        apiStatusCodeFile,
        JSON.stringify(apiStatusCode),
      );
      return true;
    } catch (e) {
      console.log(e);
      throw new Error(`save api response failed - ${e}`);
    }
  };

  on("task", {
    saveApiResponse,
    readFile,
    deleteFile,
    cleanMocks,
    removeAllMocks,
    createDirectoryIfNotExists,
  });

  install(on);
  on("before:browser:launch", (browser = {}, launchOptions) => {
    ensureBrowserFlags(browser, launchOptions);
    return launchOptions;
  });
};
