import argparse
import json
import os
import re
import requests


def saveAPIresponse(serviceURL, savedResponseFolder, harList, override_existing_response=False):

    harDir = savedResponseFolder + '/hars/'
    apiDataDirectory = savedResponseFolder + "/apiData"
    apiStatusCodeFile = savedResponseFolder + "/responseList.json"

    # with open("log.txt", "a+") as file:
    #     file.write(
    #         f"harDir, apiDataDirectory,apiStatusCodeFile :- {harDir, apiDataDirectory,apiStatusCodeFile}")

    if not(os.path.exists(apiDataDirectory)):
        os.mkdir(apiDataDirectory)

    try:
        with open(apiStatusCodeFile, "r") as openfile:
            api_status_code = json.load(openfile)
    except:
        with open(apiStatusCodeFile, "w") as f:
            json.dump({}, f)
            api_status_code = {}

    serviceList = set()

    for harName in harList:
        harFile = harDir + harName + '.har'
        with open(harFile, "r") as openfile:
            mockApiConfig = json.load(openfile)

        reqList = list(
            map(lambda request: request['request']['url'], mockApiConfig['log']['entries']))
        reqList = set(map(lambda url: url.split('&iid')[0], reqList))
        serviceList.update(reqList)

    if override_existing_response == False:
        serviceList = list(filter(lambda x: re.sub(
            "[^a-zA-Z0-9]", "_", x.replace(serviceURL, '')) not in api_status_code, serviceList))

    for service in serviceList:
        api_response = requests.get(service)

        ns = re.sub("[^a-zA-Z0-9]", "_",
                    service.replace(serviceURL, ''))

        try:
            api_data = api_response.json()
        except:
            api_data = api_response.text()
            print(api_response, "fail")

        fileName = apiDataDirectory + "/" + ns + ".json"
        with open(fileName, "w") as f:
            json.dump(api_data, f)

        api_status_code[ns] = api_response.status_code

    # with open("log.txt", "a+") as file:
    #     file.write(
    #         f"api_status_code, serviceList :- {api_status_code, serviceList}")

    with open(apiStatusCodeFile, 'w') as f:
        json.dump(api_status_code, f)


def getopts(args=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('serviceURL', type=str,
                        help="serviceURL",)
    parser.add_argument('savedResponseFolder', type=str,
                        help="cypress/fixtures/savedResponse/{spec_Name}")
    parser.add_argument('harList', type=str,
                        help="harList")
    parser.add_argument('override_existing_response', type=str,
                        help="override existing response or not")
    opts = parser.parse_args()

    return opts


def main():
    """
    Main Function
    """
    opts = getopts()
    # with open("log.txt", "w") as file:
    #     file.write(f"{opts}")
    savedResponseFolder = opts.savedResponseFolder
    serviceURL = opts.serviceURL
    harList = opts.harList.split(",")
    override_existing_response = opts.override_existing_response
    override_existing_response = override_existing_response.lower() == 'true'

    # with open("log.txt", "w") as file:
    #     file.write(
    #         f"serviceURL, savedResponseFolder, harList, override_existing_response :- {serviceURL, savedResponseFolder, harList, override_existing_response}")

    saveAPIresponse(serviceURL, savedResponseFolder,
                    harList, override_existing_response)


if __name__ == "__main__":
    main()
