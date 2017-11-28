/* eslint-disable */

"use strict";

// Dependencies
const _ = require("lodash"),
    bluebird = require("bluebird"),
    path = require("path");

// Dependencies that are promisified.
const csv = bluebird.promisifyAll(require("csv")),
    fs = bluebird.promisifyAll(require("fs"));


/**
 * @param {Object[]} plansCsv Array of healthcare plan objects.
 * @return {Object[]}
 */
function filterForSilverPlans(plansCsv) {
    return plansCsv.filter(plan => {
        return plan.metal_level === "Silver";
    });
}


/**
 * Prepend zeroes to zipcodes. This is purely cosmetic.
 *
 * @param {Object[]} slcspData
 * @return {Object[]}
 */
function formatZipcodes(slcspData) {
    slcspData.forEach((slcsp) => {
        let zipcode = slcsp.zipcode.toString();

        while (zipcode.length < 5) {
            zipcode = `0${zipcode}`;
        }

        slcsp.zipcode = zipcode;
    });

    return slcspData;
}


/**
 * @param {number[]} silverRates
 * @return {(number|string)}
 */
function getSecondLowest(silverRates) {
    if (silverRates.length > 1) {
        return silverRates.sort()[1];
    }

    return "";
}


/**
 * @param {string[]} files
 * @return {Promise<Array.<Object[]>>}
 */
function parseAllCsvs(files) {
    const csvParams = {
        auto_parse: true,
        columns: true
    };

    return bluebird.all(files.map(file => {
        return csv.parseAsync(file, csvParams);
    }));
}


/**
 * @param {string[]} filePaths
 * @return {Promise<Array.<string[]>>}
 */
function readAllFiles(filePaths) {
    return bluebird.all(filePaths.map(filePath => {
        return fs.readFileAsync(path.resolve(filePath), "utf8");
    }));
}


/**
 * @param {Object} plan
 * @param {Object} planLocation
 * @param {number[]} silverRates
 * @return {boolean}
 */
function shouldPushRate(plan, planLocation, silverRates) {
    return plan.rate_area === planLocation.rate_area && plan.state === planLocation.state && !silverRates.includes(plan.rate);
}


/**
 * @param {number} zipcode
 * @param {Object[]} locations
 * @return {Object[]}
 */
function filterForMatchingLocations(zipcode, locations) {
    return locations.filter(loc => {
        return zipcode === loc.zipcode;
    });
}


/**
 * @param {Object[]} plansCsv
 * @param {Object} filteredLocation
 * @return {number[]}
 */
function getSilverRates(plansCsv, filteredLocation) {
    const silverRates = [];

    for (const plan of plansCsv) {
        if (shouldPushRate(plan, filteredLocation, silverRates)) {
            silverRates.push(plan.rate);
        }
    }

    return silverRates;
}


/**
 * Maps the zipcodes from the slcsp file to the second lowest cost silver plan.
 *
 * @param {Object[]} slcspCsv
 * @param {Object[]} zipsCsv
 * @param {Object[]} plansCsv
 * @return {Object[]}
 */
function matchZipToRate(slcspCsv, zipsCsv, plansCsv) {
    plansCsv = filterForSilverPlans(plansCsv);

    return slcspCsv.map(slcsp => {
        let filteredLocations = filterForMatchingLocations(slcsp.zipcode, zipsCsv);

        filteredLocations = _.uniqBy(filteredLocations, "rate_area");

        /*
         * If a zipcode matches to more than one rate area, we do not attempt to
         * resolve that ambiguity. Instead, we leave the rate blank.
         *
         * If a zipcode matches up to one rate area, we set that zipcodes rate.
         */
        if (filteredLocations.length === 1) {
            const silverRates = getSilverRates(plansCsv, filteredLocations[0]);

            slcsp.rate = getSecondLowest(silverRates);
        }

        return slcsp;
    });
}


/*
 * The correct order of elements for the filePaths array is:
 *   1. slcsp
 *   2. zipcodes
 *   3. plans
 *
 * @param {string[]} filePaths The relative paths for each file.
 */
function fillSlcsp(filePaths) {
    return readAllFiles(filePaths).then(files => {
        return parseAllCsvs(files);
    }).then(([slcspCsv, zipsCsv, plansCsv]) => {
        let slcspData = matchZipToRate(slcspCsv, zipsCsv, plansCsv);
        slcspData = formatZipcodes(slcspData);

        return csv.stringifyAsync(slcspData, { header: true });
    }).then(finalizedSlcspCsv => {
        return fs.writeFileAsync(path.resolve(filePaths[0]), finalizedSlcspCsv);
    }).catch(err => {
        throw err;
    });
}

module.exports = fillSlcsp;
