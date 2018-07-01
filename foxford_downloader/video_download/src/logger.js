const fs = require("fs");
const path = require("path");

module.exports = class {
  constructor() {
    this.logFile = path.join(process.cwd(), 'log.txt');
  }

  logDetails({ counter, baseLink, mp4Link, m3u8Link }) {
    fs.appendFileSync(this.logFile,
      `
      ✨ Link #${counter + 1} details:
        ===== Is: ${baseLink}
        ===== Direct (mp4) link: ${mp4Link}
        ===== Stream (m3u8) link: ${m3u8Link}
      `
    );
  }

  reset() {
    if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
    }

    fs.closeSync(fs.openSync(this.logFile, 'w'));
  }
};
