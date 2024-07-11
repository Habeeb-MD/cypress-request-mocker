# Cypress Request Mocker

Cypress Request Mocker is a powerful plugin for Cypress that allows you to intercept API requests during tests, record responses, and replay them in subsequent test runs. It also provides the ability to mock the perceived time for your application under test.

## Features

- Intercept and record API responses during test execution
- Stub API responses in subsequent test runs using recorded data
- Mock the date and time perceived by the application
- Flexible configuration options for recording, stubbing, and blacklisting tests or suites
- Custom request handling capabilities

## Installation

Install the plugin using npm:

```bash
npm install cypress-request-mocker --save-dev
```

## Setup

1. Add the plugin to your `cypress.config.js`:

```javascript
const { defineConfig } = require("cypress");
const fs = require("fs");
const requestMocker = require("cypress-request-mocker/plugin");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
        requestMocker(on, config, fs);
    },
    // ... other configurations
  },
});
```

2. Import the plugin in your `cypress/support/e2e.js` file:

```javascript
import 'cypress-request-mocker';
require('@neuralegion/cypress-har-generator/commands');
```

3. Configure the plugin in your `cypress.config.js`:

```javascript
module.exports = defineConfig({
  e2e: {
    // ... other configurations
    requestMocker: {
      mockDate: "2023-02-09",
      interceptPattern: "https://api.example.com/**",
      baseURL: "https://api.example.com/",
      RecordAll: false,
      StubAll: true,
      // ... other options
    },
  },
});
```

## Usage

The plugin automatically intercepts requests based on your configuration. You can control its behavior using special prefixes in your test and suite titles:

- `[r]`: Force record mode for a test or suite
- `[s]`: Force stub mode for a test or suite
- `[x]`: Blacklist a test or suite (no recording or stubbing)


**Using the Plugin in Test Files**

To use the Cypress Request Mocker in your test files, you need to import and initialize it at the beginning of your test suite. Here's how to do it:

1. Import the plugin at the top of your test file:

```javascript
const requestMocker = require("cypress-request-mocker");
```

2. Initialize the plugin within your `describe` block:

```javascript
describe("Your test suite", () => {
  requestMocker();

  it("Your test case", () => {
    // Your test code here
  });
});
```

Here's an example of how your test file might look:

```javascript
const requestMocker = require("cypress-request-mocker");

describe("[r] Test mock date and record functionality", () => {
    requestMocker();
    it('should record all API calls in this suite', () => {
        // Your test code here
    });
});

describe("Test stubbing functionality", () => {
    requestMocker();
    it('[s]should stub API calls for this test', () => {
        // Your test code here
    });  
});
```

Note the use of `[r]` and `[s]` prefixes in the suite/test titles to force recording and stubbing modes respectively.

Remember to initialize `requestMocker()` in each `describe` block where you want to use it. This ensures that the plugin is properly set up for each suite of tests.


## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `mockDate` | Date to be used for mocking | `null` |
| `interceptPattern` | Pattern for intercepting requests | `"*"` |
| `baseURL` | Base URL for API requests | `""` |
| `RecordAll` | Record all tests by default | `false` |
| `StubAll` | Stub all tests by default | `true` |
| `cleanMocks` | Clean up unused mocks | `false` |
| `updateAPIresponse` | Update existing API responses | `false` |
| `useCustomMakeRequest` | Use custom request function | `false` |

For a complete list of options, refer to the plugin's source code.

## Custom API Request Method

One of the powerful features of Cypress Request Mocker is its flexibility in handling API requests when saving responses. By default, the plugin uses a built-in method to make API calls. However, you're not limited to this default behavior.

### Using a Custom Request Method

You can use your own custom method for making API requests by setting the `useCustomMakeRequest` flag to `true` in the configuration. This feature allows you to:

- Implement custom authentication mechanisms
- Add specific headers or parameters to requests
- Modify or transform the response before saving
- Handle complex API scenarios specific to your application

To use a custom request method:

1. Set `useCustomMakeRequest: true` in your plugin configuration.
2. Create a file named `requestMockerUtil.js` in your project root.
3. In this file, export a function that handles the API request. This function should accept the service URL as a parameter and return a promise that resolves to an object with `data` and `status` properties.

Example `requestMockerUtil.js`:

```javascript
const axios = require('axios');

module.exports = async function makeRequest(service) {
  // Add your custom logic here, e.g., authentication
  const response = await axios.get(service, {
    headers: {
      'Authorization': 'Bearer your-token-here'
    }
  });

  // You can modify the response here if needed
  return {
    data: response.data,
    status: response.status
  };
};
```

## How It Works

1. During the first run, the plugin records API responses for specified tests.
2. Responses are saved as fixtures.
3. In subsequent runs, the plugin intercepts matching requests and serves the saved responses.
4. The plugin can mock the system time to ensure consistent test results.

## Dependencies

This plugin relies on the following packages:
- @neuralegion/cypress-har-generator
- axios


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Issues

If you encounter any issues or have suggestions, please file an issue on the [GitHub repository](https://github.com/Habeeb-MD/cypress-request-mocker/issues).

---
