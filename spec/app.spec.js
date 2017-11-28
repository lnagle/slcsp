describe("app.js", () => {
    describe("fillSlcsp", () => {
        const bluebird = require("bluebird"),
            fillSlcsp = require("../app");

        const csv = bluebird.promisifyAll(require("csv")),
            fs = bluebird.promisifyAll(require("fs"));

        const { scaffoldTest } = require("./support/helpers")(csv, fillSlcsp, fs);

        it("fills the second lowest cost silver plan for a given zipcode", (done) => {
            scaffoldTest(1, done, (parsedCSV) => {
                expect(parsedCSV[0].rate).toBe(298.63);
                expect(parsedCSV[1].rate).toBe(282.41);
                expect(parsedCSV[2].rate).toBe(300.76);
            });
        });
        it("leaves a rate blank if there is more than one rate area", (done) => {
            scaffoldTest(2, done, (parsedCSV) => {
                expect(parsedCSV[0].zipcode).toBe(56097);
                expect(parsedCSV[0].rate).toBe("");
                expect(parsedCSV[1].zipcode).toBe(21777);
                expect(parsedCSV[1].rate).toBe("");
                expect(parsedCSV[2].zipcode).toBe(42330);
                expect(parsedCSV[2].rate).toBe(365.41);
            });
        });
        it("does not change the order of the given zipcodes", (done) => {
            scaffoldTest(3, done, (parsedCSV) => {
                expect(parsedCSV[0].zipcode).toBe(36749);
                expect(parsedCSV[1].zipcode).toBe(97910);
                expect(parsedCSV[2].zipcode).toBe(78016);
                expect(parsedCSV[3].zipcode).toBe(25510);
                expect(parsedCSV[4].zipcode).toBe(00698);
            });
        });
    });
});
