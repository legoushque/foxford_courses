const fs = require("fs");
const path = require("path");

module.exports = class {
    constructor() {
        this.logFile = path.join(path.dirname(process.argv[0]), 'log.txt');
    }

    logDlLink({ mp4Link }) {
        fs.appendFileSync(this.logFile, `${mp4Link}\n`);
    }

    reset() {
        if (fs.existsSync(this.logFile)) {
            fs.unlinkSync(this.logFile);
        }

        fs.closeSync(fs.openSync(this.logFile, 'w'));
    }
};
