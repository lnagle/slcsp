module.exports = (csv, fillSlcsp, fs) => {
    function cleanup(src, dest) {
        return fs.copyFileAsync(src, dest).then(() => {
            console.log(`Cleanup of ${dest} was successful.`);

            return;
        }).catch(err => {
            if (err) {
                console.log("There was a problem cleaning up: ", dest);
                throw err;
            }
        });
    }

    function prepForAssertions(filePath) {
        return fs.readFileAsync(filePath).then(text => {
            const csvParams = {
                auto_parse: true,
                columns: true
            };

            return csv.parseAsync(text, csvParams);
        }).catch(err => {
            console.log("There was a problem prepping for assertions: ", filePath);
            throw err;
        });
    }

    function scaffoldTest(testCase, done, callback) {
        fillSlcsp([
            `./spec/testcases/slcsp-${testCase}.csv`,
            `./spec/testcases/zips-${testCase}.csv`,
            `./spec/testcases/plans-${testCase}.csv`
        ]).then(() => {
            return prepForAssertions(`./spec/testcases/slcsp-${testCase}.csv`);
        }).then(parsedCSV => {
            callback(parsedCSV);

            return cleanup(`./spec/testcases/slcsp-${testCase}-copy.csv`, `./spec/testcases/slcsp-${testCase}.csv`);
        }).then(() => {
            done();
        });
    }

    return {
        scaffoldTest
    };
};
