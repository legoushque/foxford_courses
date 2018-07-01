const exec = require("child_process").exec;
const logger = require("./logger");
const linkReader = require("./linkReader");

var lr = new linkReader();
var log = new logger();

module.exports = {
  logger: log,

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
  }
};
