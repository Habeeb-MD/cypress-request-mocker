"use strict";
const path = require("path");
const requestMockerConfig = Cypress.config("requestMocker") || {};

const isRecordAll = requestMockerConfig.recordAll || false;
const recordTests = requestMockerConfig.recordTests || [];
const isStubAll = requestMockerConfig.stubAll || true;
const stubTests = requestMockerConfig.stubTests || [];
let recordSuites = requestMockerConfig.recordSuites || [];
let stubSuites = requestMockerConfig.stubSuite || [];
let blacklistSuites = requestMockerConfig.blacklistSuites || [];
const blacklistTests = requestMockerConfig.blacklistTests || [];
const updateApiResponse = requestMockerConfig.updateApiResponse || false;
const blacklistRoutes = requestMockerConfig.blacklistRoutes || [];
const baseURL = requestMockerConfig.baseURL || "";
const mockDate = requestMockerConfig.mockDate
  ? new Date(requestMockerConfig.mockDate).getTime()
  : null;
let interceptPattern = requestMockerConfig.interceptPattern || "*";
const harRecordOptions = requestMockerConfig.harRecordOptions || {};
const harSaveOptions = requestMockerConfig.harSaveOptions || {};
const interceptPatternFragments =
  interceptPattern.match(/\/(.*?)\/([a-z]*)?$/i);
if (interceptPatternFragments) {
  interceptPattern = new RegExp(
    interceptPatternFragments[1],
    interceptPatternFragments[2] || "",
  );
}
const whitelistHeaders = requestMockerConfig.whitelistHeaders || [];
const useCustomMakeRequest = requestMockerConfig.useCustomMakeRequest || false;

const fileName = path.basename(
  Cypress.spec.name,
  path.extname(Cypress.spec.name),
);
// The replace fixes Windows path handling
const fixturesFolder = Cypress.config("fixturesFolder").replace(/\\/g, "/");
const savedResponseFolder = path.join(
  fixturesFolder,
  "savedResponse/" + fileName.replace(/[^a-zA-Z0-9]/g, "_"),
);
const fixturesFolderSubDirectory =
  savedResponseFolder.replace(fixturesFolder, "") + "/apiData";
const responseListFile = path.join(savedResponseFolder, "responseList.json");
const harDirPath = `${savedResponseFolder}/hars`;

let savedResponseDict = {};

module.exports = function requestMocker() {
  before(function () {
    //This is before any suite
    //for getting the list of all APIs endpoints for which response was saved
    cy.task("readFile", responseListFile).then((data) => {
      savedResponseDict = data;
      // console.log("savedResponseDict",responseListFile, data);
    });
  });

  //   const whitelistHeaderRegexes = whitelistHeaders.map((str) => RegExp(str));

  let isTestRecordingEnabled = false,
    isBlacklisted = false,
    recordedTestsList = [];

  beforeEach(function () {
    // check to see if test/suite is BlackedlistedForced
    const isTestBlackedlistedForced = this.currentTest.title.startsWith("[x]");
    const isSuiteBlackedlistedForced =
      this.currentTest.parent.title.startsWith("[x]");

    // check to see if test/suite is being force recorded
    const isTestForceRecord = this.currentTest.title.startsWith("[r]");
    const isSuiteForceRecord = this.currentTest.parent.title.startsWith("[r]");

    // check to see if test/suite is being force stubbed
    const isTestForceStub = this.currentTest.title.startsWith("[s]");
    const isSuiteForceStub = this.currentTest.parent.title.startsWith("[s]");

    //remove [x] from the test title if Test is BlackedlistedForced
    if (isTestBlackedlistedForced) {
      this.currentTest.title = this.currentTest.title.split("[x]")[1].trim();
      blacklistTests.push(this.currentTest.title);
    }

    //remove [x] from the suite title and add suite to blacklistSuites for other test
    if (isSuiteBlackedlistedForced) {
      this.currentTest.parent.title = this.currentTest.parent.title
        .split("[x]")[1]
        .trim();
      blacklistSuites.push(this.currentTest.parent.title);
    }

    //remove [r] from the test title if Test is isTestForceRecord
    if (isTestForceRecord) {
      this.currentTest.title = this.currentTest.title.split("[r]")[1].trim();
      recordTests.push(this.currentTest.title);
    }

    //remove [r] from the suite title and add suite to recordSuites for other test
    if (isSuiteForceRecord) {
      this.currentTest.parent.title = this.currentTest.parent.title
        .split("[r]")[1]
        .trim();
      recordSuites.push(this.currentTest.parent.title);
    }

    //remove [s] from the test title if Test is isTestForceStub
    if (isTestForceStub) {
      this.currentTest.title = this.currentTest.title.split("[s]")[1].trim();
      stubTests.push(this.currentTest.title);
    }

    //remove [s] from the suite title and add suite to stubSuites for other test
    if (isSuiteForceStub) {
      this.currentTest.parent.title = this.currentTest.parent.title
        .split("[s]")[1]
        .trim();
      stubSuites.push(this.currentTest.parent.title);
    }

    isBlacklisted =
      isTestBlackedlistedForced ||
      isSuiteBlackedlistedForced ||
      blacklistTests.includes(this.currentTest.title) ||
      blacklistSuites.includes(this.currentTest.parent.title);

    //if Blacklisted do not stub/record/mockDate
    if (isBlacklisted) {
      return;
    }

    let isTestStubbingEnabled = false;
    isTestRecordingEnabled =
      isTestForceRecord ||
      isSuiteForceRecord ||
      recordTests.includes(this.currentTest.title) ||
      recordSuites.includes(this.currentTest.parent.title) ||
      isRecordAll;

    //Record Test(save Har)
    if (isTestRecordingEnabled) {
      // TODO Add intercept patttern here or we can ignore API while saving data
      const recordOptions = { ...harRecordOptions, content: false };
      cy.recordHar(recordOptions);
    } else {
      isTestStubbingEnabled =
        isTestForceStub ||
        isSuiteForceStub ||
        stubTests.includes(this.currentTest.title) ||
        stubSuites.includes(this.currentTest.parent.title) ||
        isStubAll;
    }

    //mock Date -
    //only if  TestRecordingEnabled or TestStubbingEnabled
    if (isTestRecordingEnabled || isTestStubbingEnabled || mockDate != null) {
      cy.clock(mockDate, ["Date"]);
    }

    // Load stubbed data from local JSON file
    // Do not stub if this test is being recorded
    if (isTestStubbingEnabled && !isTestRecordingEnabled) {
      console.log("stubbing response");
      // Stub all routes with interceptPattern

      cy.intercept(interceptPattern, (req) => {
        const fixtureName = req.url
            .split("&iid")[0]
            .replace(baseURL, "")
            .replace(/[^a-zA-Z0-9]/g, "_"),
          fixturePath = `${fixturesFolderSubDirectory}/${fixtureName}`;

        // console.log(fixtureName,savedResponseDict);
        if (savedResponseDict && fixtureName in savedResponseDict) {
          req.reply({
            statusCode: savedResponseDict[fixtureName],
            fixture: fixturePath,
            headers: {
              "X-Stubbed-Response": "true",
            },
          });
        } else {
          console.log("not found :- " + fixtureName);

          // req.reply(500); // if not found can send some custom response(like status code 500) or
          //we can forward that call to actual server using req.continue();
          req.continue();
        }
      }).as("services");
    }
  });

  afterEach(function () {
    //if Blacklisted dont do anything
    if (isBlacklisted) {
      return;
    }

    // save the HAR file if TestRecordingEnabled
    if (isTestRecordingEnabled) {
      cy.task("createDirectoryIfNotExists", harDirPath);
      let harName = this.currentTest.title.replace(/[^a-zA-Z0-9]/g, "_");
      recordedTestsList.push(harName);
      const saveOptions = {
        ...harSaveOptions,
        outDir: harDirPath,
        fileName: harName,
      };
      cy.saveHar(saveOptions);
    }
  });

  after(function () {
    //after -  invoke the function to fetch api data for recordedTests and save them for later use
    //if overrideExistingResponse is false it will not override existing response, usually it is preferred to avoid duplicate API calls and save time)
    // console.log({ recordedTestsList });
    if (recordedTestsList.length > 0) {
      // console.log('saveApiResponse',baseURL, savedResponseFolder, recordedTestsList.toString(), updateApiResponse,useCustomMakeRequest);
      cy.task("saveApiResponse", {
        serviceURL: baseURL,
        savedResponseFolder: savedResponseFolder,
        harList: recordedTestsList,
        overrideExistingResponse: updateApiResponse,
        useCustomMakeRequest: useCustomMakeRequest,
      });
    }
  });
};
