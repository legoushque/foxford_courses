const ffbinaries = require("ffbinaries");
const fs = require("fs");
const path = require("path");
const util = require("util");
const puppeteer = require("puppeteer");
const exec = util.promisify(require("child_process").exec);
const chalk = require("chalk");
const query = require("cli-interact").getYesNo;
const slug = require("slug");

var linksFile = __dirname + '/links.txt';
var chromeData = __dirname + '/data';
var ffmpegBin = process.platform === "win32" ? 'ffmpeg.exe' : 'ffmpeg';

console.log(chalk.magenta('Coded by @limitedeternity. \n'));
console.log(chalk.yellow('Внимание. Настоятельно рекомендуется использовать VPN, чтобы избежать проблем, возникающих во время бесчинств РКН.\n'));

(async () => {

    // Checks for ffmpeg in current dir
    if (!fs.existsSync(ffmpegBin)) {
        console.log(chalk.yellow('FFMpeg не найден. Скачиваю...'));
    
        ffbinaries.downloadBinaries(['ffmpeg'], { destination: __dirname }, () => {
            console.log(chalk.green('FFMpeg загружен.\n'));
        });

    } else {
        console.log(chalk.green('FFMpeg найден.'));
    }

    if (process.argv[2] === '--with-auth') {
        // Checks for links.txt

        if (fs.existsSync(linksFile)) {
            console.log(chalk.green('Links.txt найден.\n'));

        } else {
            fs.closeSync(fs.openSync(linksFile, 'w'));
            console.log(chalk.yellow('Links.txt создан. \n'));
        }

        // Waits for user to log in
        console.log(chalk.yellow('Войдите в свой аккаунт, если еще этого не сделали, а затем соберите ссылки на видео (вида "https://foxford.ru/groups/<id>") и положите их в links.txt\n'));

        var browser = await puppeteer.launch({
            userDataDir: chromeData,
            headless: false,
            devtools: true
        });

        var page = await browser.newPage();

        await page.goto('https://foxford.ru/user/login?redirect=/dashboard');
        let ans = query(chalk.yellow('Введите Y, когда будете готовы. N - чтобы выйти.'));

        await browser.close();

        if (!ans) {
            process.exit(0);
        }

        console.log(chalk.blue('Если захотите пропустить данный этап и сразу перейти к скачиванию по ссылкам в links.txt, вместо "npm start" выполните "npm run faststart"'));
    }

    // #######################
    // Runs puppeteer in headless mode and begins iterating over links

    var browser = await puppeteer.launch({
        userDataDir: chromeData,
        headless: true
    });

    var page = await browser.newPage();
    console.log('=========');

    let counter = 1;
    let linkList = fs.readFileSync(linksFile, 'utf8').replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/).filter(Boolean);

    for (const link of linkList) {
        console.log(chalk.blue(`Готовлюсь к скачиванию видео по ссылке #${counter}...`));

        try {
            await Promise.all([
                page.goto(link),
                page.waitForSelector('.full_screen')
            ]);
    
            var erlyFronts = await page.evaluate(() => document.getElementsByClassName('full_screen')[0].firstChild.src);
            
            await Promise.all([
                page.goto(erlyFronts),
                page.waitForSelector('video')
            ]);
            
            var m3u8Link = await page.evaluate(() => document.getElementsByTagName('video')[0].firstChild.src);
            var authToken = await page.evaluate(() => JSON.parse(localStorage[`account_${localStorage.account_id}`]).access_token);
            var lessonName = await page.evaluate(() => document.querySelector('[class^="Header__name__"]').innerText);

        } catch (err) {
            console.log(chalk.red('Обнаружена проблема при получении видео. Беру следующее...'));
            console.log('=========\n');
            counter++;
            
            continue;

        }

        let filename = `${slug(lessonName)}.mp4`;

        console.log(chalk.blue(`Скачиваю видео по ссылке #${counter}... Это займет какое-то время.`));

        await exec(`${ffmpegBin} -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: ${authToken}" -headers "Referer: ${erlyFronts}" -headers "Origin: https://lesson.foxford.ru" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "${m3u8Link}" -bsf:a aac_adtstoasc -c copy ${filename}`);
        console.log(chalk.green(`Скачивание видео #${counter} завершено! Сохранено в ${filename}`));
        console.log('=========\n');

        counter++;
    }

    console.log(chalk.green('Загрузка завершена.'));
    await browser.close();

})();
