const { defineConfig } = require("cypress");

const requestMocker = require("./plugin");

module.exports = defineConfig({
  e2e: {
    requestMocker: {
      mockDate: "2023-02-09",
      interceptPattern: "https://byabbe.se/on-this-day/**",
      baseURL: "https://byabbe.se/on-this-day/",
      harRecordOptions: {
        includeMimes: ["application/json"],
        includeHosts: ["byabbe.se"],
        excludePaths: [],
      },
      harSaveOptions: {},
      recordAll: false,
      stubAll: true,
      cleanMocks: false,
      stubTests: [],
      recordTests: [],
      updateApiResponse: false,
      useCustomMakeRequest: false,
    },
    video: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here

      //requestMocker
      requestMocker(on, config);
    },
  },
});
