const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const request = require("request");
const progress = require("request-progress");
const chalk = require("chalk");
const slug = require("slug");

var utils = require("./utils");

var ffmpegBin = process.platform === 'win32'
                    ?
                    path.join(path.dirname(process.argv[0]), 'ffmpeg.exe')
                    :
                    path.join(path.dirname(process.argv[0]), 'ffmpeg');

var chromiumBin = process.platform === 'win32'
                    ?
                    path.join(path.dirname(process.argv[0]), 'chromium', 'chrome.exe')
                    :
                  process.platform === 'darwin'
                    ?
                    path.join(path.dirname(process.argv[0]), 'chromium', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
                    :
                    path.join(path.dirname(process.argv[0]), 'chromium', 'chrome');

const download = async ({ linkList }) => {
    let browser = await puppeteer.launch({
        executablePath: chromiumBin,
        headless: true,
        args: [
            '--disable-sync',
            '--disable-translate',
            '--disable-extensions',
            '--disable-default-apps',
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*',
            '--mute-audio',
            '--hide-scrollbars'
        ]
    });

    let page = await browser.newPage();
    let { login, password } = await utils.queryCredentials();

    try {
        await page.goto('https://foxford.ru/user/login?redirect=/dashboard');
        await page.waitForSelector("div[class^='AuthLayout__container']");
        await page.evaluate(`
            fetch("https://foxford.ru/user/login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    ...ReactOnRails.authenticityHeaders()
                },
                body: JSON.stringify({
                    user: {
                        email: "${login}",
                        password: "${password}"
                    }
                })
            }).then(() => location.reload());
        `);

        await utils.anyPromise([
            page.waitForSelector("div[class^='PupilDashboard']"),
            page.waitForSelector("div[class^='TeacherDashboard']")
        ]);

    } catch (err) {
        console.log(chalk.red('Обнаружена проблема при входе.'));
        console.log(`Трейсбек: \n ${err} \n`);
        process.exit(1);
    }

    let processList = [];

    for (let [counter, link] of linkList.entries()) {
        console.log(chalk.blue(`Готовлюсь к добавлению в очередь видео по ссылке #${counter + 1}...`));

        try {
            await page.goto(link);
            await page.waitForSelector('.full_screen > iframe');

            let erlyFronts = await page.evaluate(`document.querySelector('.full_screen > iframe').src;`);

            await page.goto(erlyFronts);
            await page.waitForSelector('video > source');

            var globalLessonName = await page.evaluate(`document.querySelector('[class^="Header__name__"]').innerText;`);

            var globalM3u8Link = await page.evaluate(`document.querySelector('video > source').src;`);

            var globalMp4Link = globalM3u8Link
                |> (m3u8Link => new URL(m3u8Link))
                |> (urlObj => {
                        urlObj.pathname = urlObj
                                            .pathname
                                            .replace("hls.", "ms.")
                                            .replace("master.m3u8", "mp4");
                        return urlObj;
                    })
                |> (modUrlObj => modUrlObj.href);

            utils.logger.logDlLink({ mp4Link: globalMp4Link });

        } catch (err) {
            console.log(chalk.red('Обнаружена проблема при получении видео.'));
            console.log(`Трейсбек: \n ${err} \n`);
            continue;
        }

        processList.push(
            new Promise(async (finalResolve, finalReject) => {
                let lessonName = globalLessonName.valueOf();
                let m3u8Link = globalM3u8Link.valueOf();
                let mp4Link = globalMp4Link.valueOf();

                let mp4DlSucceeded = await new Promise(async (mp4Resolve, mp4Reject) => {
                    let mp4Destination = path.join(path.dirname(process.argv[0]), `${slug(lessonName)}.mp4`);

                    let videoContentLength = await new Promise((resolve, reject) => {
                        request.head(mp4Link, (err, response, body) => {
                            if (err || response.statusCode !== 200) {
                                reject(`${err}. Код: ${response.statusCode}`);
                            }

                            resolve(response.headers['content-length']);
                        });
                    });

                    await new Promise((resolve, reject) => {
                        progress(request(mp4Link))
                            .on('error', err => reject(err))
                            .on('end', () => resolve(true))
                            .pipe(fs.createWriteStream(mp4Destination));
                    });

                    let mp4Stat = fs.statSync(mp4Destination);
                    let mp4Size = mp4Stat.size;

                    if (Number(mp4Size) === Number(videoContentLength)) {
                        console.log(chalk.green(`${path.basename(mp4Destination)} ...✓\n`));
                        mp4Resolve(true);

                    } else {
                        console.log(chalk.yellow(`Видео ${path.basename(mp4Destination)} повреждено. Это не я, честно! Но сейчас попробую что-нибудь с этим сделать...\n`));
                        fs.unlink(mp4Destination, err => {});
                        mp4Resolve(false);
                    }
                });

                if (!mp4DlSucceeded) {
                    let mp4Destination = path.join(path.dirname(process.argv[0]), `${slug(lessonName)}.mp4`);

                    console.log(chalk.green(`Скачивание видео ${path.basename(mp4Destination)} запущено повторно. Это займет дольше, чем рассчитывалось.\n`));

                    let { stderr } = await utils.executeCommand(`${ffmpegBin} -hide_banner -loglevel error -i "${m3u8Link}" -c copy -bsf:a aac_adtstoasc ${mp4Destination}`);

                    if (stderr) {
                        fs.unlink(mp4Destination, err => {});

                        console.log(chalk.yellow(`Не удалось скачать видео ${path.basename(mp4Destination)}. \nТрейсбек: ${stderr}\n`));
                        finalResolve(false);

                    } else {
                        console.log(chalk.green(`${path.basename(mp4Destination)} ...✓\n`));
                        finalResolve(true);
                    }

                } else {
                    finalResolve(true);
                }
            })
        );

        console.log(chalk.green(`Видео #${counter + 1} добавлено в очередь! Будет сохранено в ${slug(globalLessonName)}.mp4\n`));
    }

    browser.close();

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

    console.log(chalk.green(`\nЗагрузка завершена в ${hoursEnd}:${minutesEnd}:${secondsEnd}. Завершаю работу...\n`));
};

(() => {
    console.log(chalk.magenta('Coded by @limitedeternity.\n'));

    require("events").EventEmitter.prototype._maxListeners = Infinity;

    fs.chmodSync(ffmpegBin, 0o755);
    fs.chmodSync(chromiumBin, 0o755);

    utils.logger.reset();
    utils.linkReader.promptLinks();

    download({ linkList: utils.linkReader.linkList });
})();
