const fs = require("fs");
const path = require("path");
const { Chromeless } = require("chromeless");
const { Download } = require("easydownload");
const chalk = require("chalk");
const slug = require("slug");

var utils = require("./utils");

const download = async ({ linkList }) => {
    let browser = new Chromeless({
        scrollBeforeClick: true,
        implicitWait: true,
        launchChrome: true,
        waitTimeout: 30000 // 30 seconds
    });

    let { login, password } = await utils.queryCredentials();

    try {
        await browser
            .goto('https://foxford.ru/user/login?redirect=/dashboard')
            .wait("div[class^='AuthLayout__container']")
            .type(login, 'input[name="email"]')
            .type(password, 'input[name="password"]')
            .click("button[class^='Button__root']")
            .wait("div[class^='PupilDashboard']")
            .evaluate(() => console.log("Ready!"));

    } catch (err) {
        console.log(chalk.red('Обнаружена проблема при входе.'));
        console.log(`Трейсбек: \n ${err} \n`);
        process.exit(1);
    }

    let processList = [];

    for (let [counter, link] of linkList.entries()) {
        console.log(chalk.blue(`Готовлюсь к добавлению в очередь видео по ссылке #${counter + 1}...`));

        try {
            await browser
                .goto(link)
                .wait('.full_screen')
                .evaluate(() => console.log("Navigated!"));

            let erlyFronts = await browser.evaluate(() => document.querySelector('.full_screen').firstChild.src);

            await browser
                .goto(erlyFronts)
                .wait('video > source')
                .evaluate(() => console.log("Navigated!"));

            var lessonName = await browser.evaluate(() => document.querySelector('[class^="Header__name__"]').innerText);
            let m3u8Link = await browser.evaluate(() => document.querySelector("video > source").src);
            var mp4Link = m3u8Link
                |> (m3u8Link => new URL(m3u8Link))
                |> (urlObj => {
                        urlObj.pathname = urlObj
                                            .pathname
                                            .replace("hls.", "ms.")
                                            .replace("master.m3u8", "mp4");
                        return urlObj;
                    })
                |> (modUrlObj => modUrlObj.href);

            utils.logger.logDetails({ counter: counter + 1, baseLink: link, mp4Link: mp4Link, m3u8Link: m3u8Link });

        } catch (err) {
            console.log(chalk.red('Обнаружена проблема при получении видео.'));
            console.log(`Трейсбек: \n ${err} \n`);
            continue;
        }

        processList.push(
            new Promise(resolve => {
                let filename = `${slug(lessonName)}.mp4`;
                let dl = new Download(mp4Link, path.join(process.cwd(), filename));

                dl.on('finish', () => {
                    resolve(filename);
                });

                dl.on('error', err => {
                    throw err;
                });

                dl.start();

            }).then(filename => {
                console.log(chalk.green(`${filename} ...✓`));
            })
        );

        console.log(chalk.green(`Видео #${counter + 1} добавлено в очередь! Будет сохранено в ${slug(lessonName)}.mp4\n`));
    }

    await browser.end();

    let timeStart = new Date();
    let hoursStart = ('0' + timeStart.getHours()).slice(-2);
    let minutesStart = ('0' + timeStart.getMinutes()).slice(-2);
    let secondsStart = ('0' + timeStart.getSeconds()).slice(-2);

    console.log(chalk.green(`Автоматическое скачивание видео запущено в ${hoursStart}:${minutesStart}:${secondsStart}. Это займет какое-то время.\n`));
    await Promise.all(processList);

    let timeEnd = new Date();
    let hoursEnd = ('0' + timeEnd.getHours()).slice(-2);
    let minutesEnd = ('0' + timeEnd.getMinutes()).slice(-2);
    let secondsEnd = ('0' + timeEnd.getSeconds()).slice(-2);

    console.log(chalk.green(`\nЗагрузка завершена в ${hoursEnd}:${minutesEnd}:${secondsEnd}.\n`));
};

(() => {
    console.log(chalk.magenta('Coded by @limitedeternity.\n'));

    require("events").EventEmitter.prototype._maxListeners = Infinity;

    utils.logger.reset();
    utils.linkReader.promptLinks();

    download({ linkList: utils.linkReader.linkList });

})();
