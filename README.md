# Cypress Request Mocker

Cypress Request Mocker is a powerful plugin for Cypress that intercepts API requests during tests, records responses,
and replays them in subsequent test runs. It also provides the ability to mock the perceived time for the application
under test.

## Features

- Intercept and record API responses during test execution
- Stub API responses in subsequent test runs using recorded data
- Mock the date and time perceived by the application
- Selective recording and stubbing of tests or suites
- Flexible configuration options for recording, stubbing, and blacklisting
- Custom request handling capabilities
- Automatic cleanup of unused mocks
- Updating of existing API responses
- Configurable HAR recording and saving options

## Installation

Install the plugin using npm:

```bash
npm install cypress-request-mocker --save-dev
```

## Setup

1. Add the plugin to `cypress.config.js`:

```javascript
const {defineConfig} = require("cypress");
const requestMocker = require("cypress-request-mocker/plugin");

module.exports = defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            requestMocker(on, config);
        },
// ... other configurations
    },
});
```

2. Import the plugin in `cypress/support/e2e.js`:

```javascript
import 'cypress-request-mocker';

require('@neuralegion/cypress-har-generator/commands');
```

3. Configure the plugin in `cypress.config.js`:

```javascript
module.exports = defineConfig({
    e2e: {
        requestMocker: {
            mockDate: "2023-02-09",
            interceptPattern: "https://api.example.com/**",
            baseURL: "https://api.example.com/",
            harRecordOptions: {
                includeMimes: ["application/json"],
                includeHosts: ["api.example.com"],
                excludePaths: [],
            },
            harSaveOptions: {},
            recordAll: false,
            stubAll: true,
            cleanMocks: false,
            stubTests: [],
            recordTests: [],
            blacklistTests: [],
            blacklistSuites: [],
            updateApiResponse: false,
            useCustomMakeRequest: false,
        },
// ... other configurations
    },
});
```

## Configuration Options

| Option                 | Description                       | Default |
|------------------------|-----------------------------------|---------|
| `mockDate`             | Date to be used for mocking       | `null`  |
| `interceptPattern`     | Pattern for intercepting requests | `"*"`   |
| `baseURL`              | Base URL for API requests         | `""`    |
| `harRecordOptions`     | Options for HAR recording         | `{}`    |
| `harSaveOptions`       | Options for saving HAR files      | `{}`    |
| `recordAll`            | Record all tests by default       | `false` |
| `stubAll`              | Stub all tests by default         | `true`  |
| `cleanMocks`           | Clean up the unused mock data     | `false` |
| `stubTests`            | Array of test names to stub       | `[]`    |
| `recordTests`          | Array of test names to record     | `[]`    |
| `blacklistTests`       | Array of test names to blacklist  | `[]`    |
| `blacklistSuites`      | Array of suite names to blacklist | `[]`    |
| `updateApiResponse`    | Update existing API responses     | `false` |
| `useCustomMakeRequest` | Use custom request function       | `false` |

## Usage

The plugin automatically intercepts requests based on the configuration. Its behavior can be controlled using special
prefixes in test and suite titles:

- `[r]`: Force record mode for a test or suite
- `[s]`: Force stub mode for a test or suite
- `[x]`: Blacklist a test or suite (no recording or stubbing)

### Using the Plugin in Test Files

To use Cypress Request Mocker in test files, import and initialize it at the beginning of the test suite:

```javascript
const requestMocker = require("cypress-request-mocker");

describe("Test suite", () => {
    requestMocker();

    it("Test case", () => {
// Test code here
    });
});
```

Example with prefixes:

```javascript
describe("[r] Test mock date and record functionality", () => {
    requestMocker();
    it('should record all API calls in this suite', () => {
// Test code here
    });
});

describe("Test stubbing functionality", () => {
    requestMocker();
    it('[s] should stub API calls for this test', () => {
// Test code here
    });
});
```

## Selective Recording and Stubbing

Recording and stubbing behavior can be controlled at a granular level:

- Use `recordTests` and `stubTests` arrays to specify which tests to record or stub.
- Use `blacklistTests` and `blacklistSuites` to exclude specific tests or suites from recording/stubbing.
- Set `recordAll: true` to record all tests by default.
- Set `stubAll: true` to stub all tests by default.

## Request Interception

Use `interceptPattern` to specify which requests to intercept. This can be a string or a regular expression.

## Updating API Responses

Set `updateApiResponse: true` to update existing recorded API responses. This is useful for keeping stubs up-to-date
with the latest API changes.

## Custom API Request Method

A custom method for making API requests can be used by setting the `useCustomMakeRequest` flag to `true` in the
configuration. This allows for implementing custom authentication mechanisms, adding specific headers or parameters to
requests, or modifying responses before saving.

To use a custom request method:

1. Set `useCustomMakeRequest: true` in the plugin configuration.
2. Create a file named `requestMockerUtil.js` in the project root.
3. In this file, export a function that handles the API request.

Example `requestMockerUtil.js`:

```javascript
const axios = require('axios');

module.exports = async function makeRequest(service) {
// Add custom logic here, e.g., authentication
    const response = await axios.get(service, {
        headers: {
            'Authorization': 'Bearer token-here'
        }
    });

    return {
        data: response.data,
        status: response.status
    };
};
```

## Dependencies

This plugin relies on the following packages:

- @neuralegion/cypress-har-generator
- axios

## Contributing

Contributions are welcome. Please submit a Pull Request for any improvements.

## License

This project is licensed under the ISC License.

## Issues

For any issues or suggestions, please file an issue on the GitHub repository.

---
