const ffbinaries = require("ffbinaries");
const fs = require("fs");
const path = require("path");
const util = require("util");
const crypto = require("crypto");
const puppeteer = require("puppeteer");
const exec = util.promisify(require("child_process").exec);
const chalk = require("chalk");
const query = require("cli-interact").getYesNo;

const ffDest = __dirname + '/ffmpeg';
const linksFileDest = __dirname + '/links.txt';
const chromeData = __dirname + '/data';

console.log(chalk.magenta('Coded by @limitedeternity. \n'));
console.log(chalk.yellow('Внимание. Настоятельно рекомендуется использовать VPN, чтобы избежать проблем, возникающих во время бесчинств РКН.\n'));

// Checks for ffmpeg in current dir
if (!fs.existsSync(ffDest + '/ffmpeg.exe')) {
    console.log(chalk.yellow('FFMpeg не найден. Скачиваю...'));
    
    ffbinaries.downloadBinaries(['ffmpeg'], { destination: ffDest }, () => {
        console.log(chalk.green('Готово\n'));
    });

} else {
    console.log(chalk.green('FFMpeg найден.'));
}

// Checks links.txt
if (fs.existsSync(linksFileDest)) {
    console.log(chalk.green('Links.txt найден.\n'));

} else {
    fs.closeSync(fs.openSync(linksFileDest, 'w'));

}

(async () => {
    // Waits for user to log in

    console.log(chalk.yellow('Войдите в свой аккаунт, если еще этого не сделали, а затем соберите ссылки на видео (вида "/groups/<id>") и положите их в links.txt\n'));

    let browser = await puppeteer.launch({
        userDataDir: chromeData,
        headless: false
    });

    let page = await browser.newPage();
    await page.goto('https://foxford.ru/user/login?redirect=/dashboard');
    let ans = query(chalk.yellow('Введите Y, когда будете готовы. N - чтобы выйти.'));

    await browser.close();

    if (!ans) {
        process.exit(0);
    }

    // #######################
    // Runs puppeteer in headless mode and begins iterating over links

    browser = await puppeteer.launch({
        userDataDir: chromeData,
        headless: true
    });

    page = await browser.newPage();
    console.log('=========');

    let counter = 1;
    let linkList = fs.readFileSync(linksFileDest, 'utf8').replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/).filter(Boolean);

    for (const link of linkList) {
        console.log(chalk.blue(`Готовлюсь к скачиванию видео по ссылке #${counter}...`));

        await page.goto(link);

        try {
            let erlyFronts = await page.evaluate(() => document.getElementsByClassName('full_screen')[0].firstChild.src);
            await page.goto(erlyFronts);
        
            let m3u8Link = await page.evaluate(() => document.getElementsByTagName('video')[0].firstChild.src);
            let authToken = await page.evaluate(() => JSON.parse(localStorage[`account_${localStorage.account_id}`]).access_token);

        } catch (err) {
            console.log(chalk.red('Обнаружена проблема при получении видео. Беру следующее...'));
            console.log('=========\n');
            continue;

        }

        let filename = `${crypto.randomBytes(10).toString('hex')}.mp4`;

        console.log(chalk.blue(`Скачиваю видео по ссылке #${counter}... Это займет какое-то время.`));

        await exec(`${ffDest + '/ffmpeg.exe'} -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: ${authToken}" -headers "Referer: ${erlyFronts}" -headers "Origin: https://lesson.foxford.ru" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1" -i "${m3u8Link}" -bsf:a aac_adtstoasc -c copy ${filename}.mp4`);
        console.log(chalk.green(`Скачивание видео #${counter} завершено! Сохранено в ${filename}`));
        console.log('=========\n');

        counter++;
    }

    console.log(chalk.green('Загрузка завершена.'));
    await browser.close();

})();
