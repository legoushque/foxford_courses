const exec = require("child_process").exec;
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { getYesNo, question } = require("cli-interact");
const chalk = require("chalk");

const Logger = require("./logger");
const LinkReader = require("./linkReader");

var lr = new LinkReader();
var lg = new Logger();

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

  queryCredentials() {
    return new Promise(resolve => {
      if (fs.existsSync(path.join(process.cwd(), 'credentials.db'))) {
        let db = new sqlite3.Database(path.join(process.cwd(), 'credentials.db'));

        db.serialize(() => {
          db.get("SELECT login, password FROM credentials LIMIT 1;", (err, row) => {
            if (err) throw err;

            db.close();
            resolve(row);
          });
        });

      } else {
        console.log(chalk.yellow('Войдите в свой аккаунт\n'));

        let login = question(chalk.green('Логин: '));
        let password = question(chalk.green('Пароль: '));

        let isReady = getYesNo(chalk.yellow(`\nВсё верно? ${login} : ${password}`));
        console.log("\n");

        if (isReady) {
          let db = new sqlite3.Database(path.join(process.cwd(), 'credentials.db'));

          db.serialize(() => {
            db.run("CREATE TABLE credentials(login TEXT, password TEXT);")
            db.run("INSERT INTO credentials VALUES(?, ?)", [login, password]);
          });

          db.close();
          resolve({ login, password });

        } else {
          process.exit(0);
        }
      }
    });
  }
};
