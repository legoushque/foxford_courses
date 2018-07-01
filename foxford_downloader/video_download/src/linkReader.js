const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const query = require("cli-interact").getYesNo;

module.exports = class {
  constructor() {
    this.linksFile = path.join(process.cwd(), 'links.txt');
  }

  get linkList() {
    let linkList = fs.readFileSync(this.linksFile, 'utf8')
                    .replace(/\r\n/g, "\r")
                    .replace(/\n/g, "\r")
                    .split(/\r/)
                    .filter(Boolean)
                    |> (filteredList => new Set(filteredList))
                    |> (uniqueList => [...uniqueList]);

    if (linkList.length === 0) {
        console.log(chalk.red('Ссылки не загружены'));
        process.exit(1);
    }

    if (!linkList.every(elem => { return /^https:\/\/foxford\.ru\/groups\/\d{3,6}$/.test(elem) })) {
        console.log(chalk.red('Одна или несколько ссылок не прошли проверку на корректность.'));
        process.exit(1);

    } else {
        console.log(chalk.green(`Ссылок загружено: ${linkList.length}`));
        return linkList;
    }
  }

  promptLinks() {
    if (fs.existsSync(this.linksFile)) {
        console.log(chalk.green('links.txt найден.\n'));

    } else {
        fs.closeSync(fs.openSync(linksFile, 'w'));
        console.log(chalk.yellow('links.txt создан.\n'));
    }

    console.log(chalk.yellow('Соберите ссылки на видео вида "https://foxford.ru/groups/<id>" и положите их в links.txt\n'));

    let isReady = query(chalk.yellow('Введите Y, когда будете готовы. N - чтобы выйти.'));
    if (!isReady) {
        process.exit(0);
    }
  }
};
