const { defineConfig } = require("cypress");
const fs = require("fs");

const requestMocker = require("./plugin.js");
const {
  install,
  ensureBrowserFlags,
} = require("@neuralegion/cypress-har-generator");

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
    },

    setupNodeEvents(on, config) {
      // implement node event listeners here

      //requestMocker
      requestMocker(on, config, fs);

      //cypress-har-generator
      install(on);

      on("before:browser:launch", (browser = {}, launchOptions) => {
        ensureBrowserFlags(browser, launchOptions);
        return launchOptions;
      });
    },
  },
});
