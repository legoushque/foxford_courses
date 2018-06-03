const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const fs = require("fs");
const path = require("path");
const url = require("url");
const util = require("util");
const { Chromeless } = require("chromeless");
const exec = util.promisify(require("child_process").exec);
const chalk = require("chalk");
const query = require("cli-interact").getYesNo;
const slug = require("slug");

var linksFile = __dirname + '/links.txt';
var ffmpegBin = ffmpeg.path;

console.log(chalk.magenta('Coded by @limitedeternity. \n'));
console.log(chalk.yellow('Внимание. Настоятельно рекомендуется использовать VPN, чтобы избежать проблем, возникающих во время бесчинств РКН.\n'));

(async () => {

    if (fs.existsSync(linksFile)) {
        console.log(chalk.green('Links.txt найден.\n'));

    } else {
        fs.closeSync(fs.openSync(linksFile, 'w'));
        console.log(chalk.yellow('Links.txt создан. \n'));
    }

    console.log(chalk.yellow('Войдите в свой аккаунт, если еще этого не сделали, а затем соберите ссылки на видео (вида "https://foxford.ru/groups/<id>") и положите их в links.txt\n'));

    const browser = new Chromeless({
        scrollBeforeClick: true,
        launchChrome: true
    });

    await browser.goto('https://foxford.ru/user/login?redirect=/dashboard').evaluate(() => {
        console.log('Started!');
    });

    var isReady = query(chalk.yellow('Введите Y, когда будете готовы. N - чтобы выйти.'));
    if (!isReady) {
        await browser.end();
        process.exit(0);
    }

    var counter = 1;
    var linkList = fs.readFileSync(linksFile, 'utf8').replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/).filter(Boolean);

    if (linkList.length === 0) {
        console.log(chalk.red('Ссылки не загружены'));
        await browser.end();
        process.exit(1);
    }

    if (!linkList.every((elem) => { return Boolean(elem.match(/^https:\/\/foxford\.ru\/groups\/\d{3,6}$/)) })) {
        console.log(chalk.red('Одна или несколько ссылок не прошли проверку на корректность.'));
        await browser.end();
        process.exit(1);

    } else {
        let time = new Date;

        let hours = ('0' + time.getHours()).slice(-2);
        let minutes = ('0' + time.getMinutes()).slice(-2);
        let seconds = ('0' + time.getSeconds()).slice(-2);

        console.log(chalk.green(`Ссылок загружено: ${linkList.length}. Скачивание начато в ${hours}:${minutes}:${seconds}\n`));
    }

    if (linkList.length > 1) {
        var isMultiprocess = true;

    } else {
        var isMultiprocess = false;
    }

    if (isMultiprocess) {
        var processList = [];
    }

    console.log('=========\n');

    for (const link of linkList) {
        if (isMultiprocess) {
            console.log(chalk.blue(`Готовлюсь к добавлению в очередь видео по ссылке #${counter}...`));

        } else {
            console.log(chalk.blue(`Готовлюсь к скачиванию видео по ссылке #${counter}...`));
        }

        try {
            await browser.goto(link).wait('.full_screen');

            var erlyFronts = await browser.evaluate(() => document.getElementsByClassName('full_screen')[0].firstChild.src);

            await browser.goto(erlyFronts).wait('video');

            var m3u8Link = await browser.evaluate(() => document.getElementsByTagName('video')[0].firstChild.src);
            var lessonName = await browser.evaluate(() => document.querySelector('[class^="Header__name__"]').innerText);
            var erlyOrigin = await browser.evaluate(() => location.origin);
            var authToken = url.parse(erlyFronts, true).query.token;

            await browser.setHtml('<h1 style="text-align:center;">Теперь это окно можно свернуть</h1>').evaluate(() => {
                console.log('Operation chain finished!');
            });

        } catch (err) {
            console.log(chalk.red('Обнаружена проблема при получении видео. Беру следующее...'));
            console.log(`Трейсбек: \n ${err}`);
            console.log('=========\n');
            counter++;

            continue;

        }

        var filename = `${slug(lessonName)}.mp4`;

        if (!isMultiprocess) {
            console.log(chalk.green(`Скачиваю видео по ссылке #${counter}... Это займет какое-то время.`));
            await exec(`${ffmpegBin} -hide_banner -nostats -loglevel panic -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: ${authToken}" -headers "Referer: ${erlyFronts}" -headers "Origin: ${erlyOrigin}" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "${m3u8Link}" -bsf:a aac_adtstoasc -c copy ${filename}`, {
                maxBuffer: Infinity
            });

            console.log(chalk.green(`Скачивание видео #${counter} завершено! Сохранено в ${filename}`));

        } else {
            processList.push(
                exec(`${ffmpegBin} -hide_banner -nostats -loglevel panic -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: ${authToken}" -headers "Referer: ${erlyFronts}" -headers "Origin: ${erlyOrigin}" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "${m3u8Link}" -bsf:a aac_adtstoasc -c copy ${filename}`, {
                    maxBuffer: Infinity

                }).then(() => {
                    console.log(chalk.green('...✓'));
                })
            );

            console.log(chalk.green(`Видео #${counter} добавлено в очередь! Будет сохранено в ${filename}`));
        }

        console.log('=========\n');
        counter++;
    }

    await browser.end();

    if (isMultiprocess) {
        console.log(chalk.green('Скачивание видео запущено. Это займет какое-то время.\n'));
        await Promise.all(processList);
    }

    let time = new Date;

    let hours = ('0' + time.getHours()).slice(-2);
    let minutes = ('0' + time.getMinutes()).slice(-2);
    let seconds = ('0' + time.getSeconds()).slice(-2);

    console.log(chalk.green(`\nЗагрузка завершена в ${hours}:${minutes}:${seconds}\n`));

})();
