const { defineConfig } = require("cypress");
const fs = require("fs");

const requestMocker = require("./plugin");

module.exports = defineConfig({
  e2e: {
    requestMocker: {
      mockDate: "2023-02-09",
      interceptPattern: "https://byabbe.se/on-this-day/**",
      baseURL: "https://byabbe.se/on-this-day/",
      RecordAll: false,
      StubAll: true,
      cleanMocks: false,
      stubTests: [],
      recordTests: [],
      updateAPIresponse: false,
      useCustomMakeRequest: false,
    },
    video: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here

      //requestMocker
      requestMocker(on, config, fs);
    },
  },
});
