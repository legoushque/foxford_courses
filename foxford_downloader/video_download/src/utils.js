const exec = require("child_process").exec;
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const logger = require("./logger");
const linkReader = require("./linkReader");

var lr = new linkReader();
var lg = new logger();

module.exports = {
  logger: lg,

  linkReader: lr,

  cliArgs: process.argv.slice(2).reduce((acc, arg) => {
      let [k, v] = arg.split('=');
      acc[k] = v === undefined ? true : /true|false/.test(v) ? v === 'true' : /(^[-+]?\d+\.\d+$)|(?<=\s|^)[-+]?\d+(?=\s|$)/.test(v) ? Number(v) : v;
      return acc;
  }, {}),

  executeCommand(cmd) {
    return new Promise(resolve => {
      exec(cmd, { maxBuffer: Infinity }, (error, stdout, stderr) => {
        error ? resolve({ stderr: stderr, stdout: stdout }) : resolve({ stderr: null, stdout: stdout });
      });
    });
  },

  fetchContents(url) {
    return new Promise(resolve => {
      let destination = url
                      |> (url => new URL(url))
                      |> (urlObj => urlObj.pathname.split("/").pop())
                      |> (filename => path.join(process.cwd(), filename))
      axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      }).then(response => {
        let stream = fs.createWriteStream(destination);
        response.data.pipe(stream);

        response.data.on('end', () => {
          stream.end();
        });

        response.data.on('error', (err) => {
          stream.end();
          fs.unlinkSync(destination);
          resolve({ error: err, writedTo: null });
        });

        stream.on('finish', () => {
          resolve({ error: null, writedTo: destination });
        });
      });
    });
  }
};
