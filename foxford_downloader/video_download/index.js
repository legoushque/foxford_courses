const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const fs = require("fs");
const url = require("url");
const util = require("util");
const { Chromeless } = require("chromeless");
const exec = util.promisify(require("child_process").exec);
const chalk = require("chalk");
const query = require("cli-interact").getYesNo;
const slug = require("slug");
const axios = require("axios");

var linksFile = 'links.txt';
var ffmpegBin = ffmpeg.path;

const linksReader = () => {
  if (fs.existsSync(linksFile)) {
      console.log(chalk.green('Links.txt найден.\n'));

  } else {
      fs.closeSync(fs.openSync(linksFile, 'w'));
      console.log(chalk.yellow('Links.txt создан. \n'));
  }

  console.log(chalk.yellow('Соберите ссылки на видео вида "https://foxford.ru/groups/<id>" и положите их в links.txt\n'));

  let isReady = query(chalk.yellow('Введите Y, когда будете готовы. N - чтобы выйти.'));
  if (!isReady) {
      process.exit(0);
  }

  let linkList = [...new Set(fs.readFileSync(linksFile, 'utf8').replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/).filter(Boolean))];

  if (linkList.length === 0) {
      console.log(chalk.red('Ссылки не загружены'));
      process.exit(1);
  }

  if (!linkList.every((elem) => { return Boolean(elem.match(/^https:\/\/foxford\.ru\/groups\/\d{3,6}$/)) })) {
      console.log(chalk.red('Одна или несколько ссылок не прошли проверку на корректность.'));
      process.exit(1);

  } else {
      console.log(chalk.green(`Ссылок загружено: ${linkList.length}`));
      return linkList;
  }
};

const situationChecker = async link => {
  let linkSplit = link.split("/");
  let lastDigits = linkSplit[linkSplit.length - 1];

  let firstTwo = lastDigits.slice(0, 2);
  let updatedFirstTwo = String(Number(firstTwo) + 12);
  let trailingDigits = lastDigits.slice(2);

  let webinarId = updatedFirstTwo + trailingDigits;

  let reqHeaders = {
    'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    'Connection': "keep-alive"
  };

  let isAuthFixed = false;
  let isMp4Exists = true;

  await axios({
    method: "head",
    url: `https://media-store-n.foxford.ru/api/v1/buckets/hls.webinar.foxford.ru/objects/${webinarId}.master.m3u8`,
    headers: reqHeaders
  }).catch(err => {
    if (err.response) {
      if (err.response.status === 404) {
        console.log(chalk.red("Первая ссылка вернула 404. Проверьте корректность ссылки. Если считаете, что это ошибка, сообщите разработчику."));
        process.exit(1);

      } else {
        console.log(chalk.yellow("Авторизацию починили."));
        isAuthFixed = true;
      }
    }
  });

  await axios({
    method: "head",
    url: `https://media-store-n.foxford.ru/api/v1/buckets/ms.webinar.foxford.ru/objects/${webinarId}.mp4`,
    headers: reqHeaders
  }).catch(err => {
    if (err.response) {
      if (err.response.status === 404) {
        console.log(chalk.yellow("MP4 что-то не нашлось."));
        isMp4Exists = false;
      }
    }
  });

  return { isMp4Exists, isAuthFixed };
};

const authFixedDownloader = async ({linkList, isMp4Exists}) => {
  let browser = new Chromeless({
      scrollBeforeClick: true,
      launchChrome: true
  });

  await browser.goto('https://foxford.ru/user/login?redirect=/dashboard').evaluate(() => {
      console.log('Started!');
  });

  console.log(chalk.yellow('Войдите в свой аккаунт\n'));

  let isReady = query(chalk.yellow('Введите Y, когда будете готовы. N - чтобы выйти.'));
  if (!isReady) {
      await browser.end();
      process.exit(0);
  }

  let processList = [];

  for (let [counter, link] of linkList.entries()) {
    console.log(chalk.blue(`Готовлюсь к добавлению в очередь видео по ссылке #${counter}...`));

    try {
        await browser.goto(link).wait('.full_screen');

        var erlyFronts = await browser.evaluate(() => document.getElementsByClassName('full_screen')[0].firstChild.src);

        await browser.goto(erlyFronts).wait('video');

        let linkSplit = link.split("/");
        let lastDigits = linkSplit[linkSplit.length - 1];
        let firstTwo = lastDigits.split(0, 2);
        let trailingDigits = lastDigits.split(2);
        let updatedFirstTwo = String(Number(firstTwo) + 12);

        var webinarId = updatedFirstTwo + trailingDigits;
        var lessonName = await browser.evaluate(() => document.querySelector('[class^="Header__name__"]').innerText);
        var erlyOrigin = await browser.evaluate(() => location.origin);
        var authToken = url.parse(erlyFronts, true).query.token;

        await browser.setHtml('<h1 style="text-align:center;">Теперь это окно можно свернуть</h1>').evaluate(() => {
            console.log('Operation chain finished!');
        });

    } catch (err) {
        console.log(chalk.red('Обнаружена проблема при получении видео. Сообщите разработчику.'));
        console.log(`Трейсбек: \n ${err} \n`);
        continue;
    }

    processList.push(
      new Promise(async resolve => {
        let filename = `${slug(lessonName)}.mp4`;

        if (isMp4Exists) {
          await exec(`${ffmpegBin} -hide_banner -nostats -loglevel panic -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: ${authToken}" -headers "Referer: ${erlyFronts}" -headers "Origin: ${erlyOrigin}" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1" -i "https://media-store-n.foxford.ru/api/v1/buckets/ms.webinar.foxford.ru/objects/${webinarId}.mp4" -c copy ${filename}`, {
            maxBuffer: Infinity
          });

        } else {
          await exec(`${ffmpegBin} -hide_banner -nostats -loglevel panic -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -headers "Authorization: ${authToken}" -headers "Referer: ${erlyFronts}" -headers "Origin: ${erlyOrigin}" -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1" -i "https://media-store-n.foxford.ru/api/v1/buckets/hls.webinar.foxford.ru/objects/${webinarId}.master.m3u8" -bsf:a aac_adtstoasc -c copy ${filename}`, {
            maxBuffer: Infinity
          });
        }

        resolve(filename);

      }).then(filename => {
        console.log(chalk.green(`${filename} ...✓`));

      })
    );

    console.log(chalk.green(`Видео #${counter} добавлено в очередь! Будет сохранено в ${slug(lessonName)}.mp4\n`));
  }

  await browser.end();

  let timeStart = new Date();
  let hoursStart = ('0' + timeStart.getHours()).slice(-2);
  let minutesStart = ('0' + timeStart.getMinutes()).slice(-2);
  let secondsStart = ('0' + timeStart.getSeconds()).slice(-2);

  console.log(chalk.green(`Скачивание видео запущено в ${hoursStart}:${minutesStart}:${secondsStart}. Это займет какое-то время.\n`));
  await Promise.all(processList);

  let timeEnd = new Date();
  let hoursEnd = ('0' + timeEnd.getHours()).slice(-2);
  let minutesEnd = ('0' + timeEnd.getMinutes()).slice(-2);
  let secondsEnd = ('0' + timeEnd.getSeconds()).slice(-2);

  console.log(chalk.green(`\nЗагрузка завершена в ${hoursEnd}:${minutesEnd}:${secondsEnd}\n`));
};

const runDownloader = async ({linkList, isMp4Exists}) => {
  console.log(chalk.yellow('Видео будут пронумерованы в том порядке, в котором они записаны в links.txt (начиная с нуля)'));

  let webinarIdList = linkList.map(link => {
    let linkSplit = link.split("/");
    let lastDigits = linkSplit[linkSplit.length - 1];

    let firstTwo = lastDigits.slice(0, 2);
    let updatedFirstTwo = String(Number(firstTwo) + 12);
    let trailingDigits = lastDigits.slice(2);

    return updatedFirstTwo + trailingDigits;
  });

  let processList = [];

  for (let [counter, webinarId] of webinarIdList.entries()) {
    if (isMp4Exists) {
      processList.push(
        new Promise(async resolve => {

          let filename = `${counter}.mp4`;

          await exec(`${ffmpegBin} -hide_banner -nostats -loglevel panic -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1" -i "https://media-store-n.foxford.ru/api/v1/buckets/ms.webinar.foxford.ru/objects/${webinarId}.mp4" -c copy ${filename}`, {
            maxBuffer: Infinity
          });

          resolve(filename);

        }).then(filename => {
          console.log(chalk.green(`${filename} ...✓`));
        })
      );

    } else {
      processList.push(
        new Promise(async resolve => {
          let filename = `${counter}.mp4`;

          await exec(`${ffmpegBin} -hide_banner -nostats -loglevel panic -timeout 5000000 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -user_agent "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1" -i "https://media-store-n.foxford.ru/api/v1/buckets/hls.webinar.foxford.ru/objects/${webinarId}.master.m3u8" -bsf:a aac_adtstoasc -c copy ${filename}`, {
            maxBuffer: Infinity
          });

          resolve(filename);

        }).then(filename => {
          console.log(chalk.green(`${filename} ...✓`));
        })
      );
    }

  }

  let timeStart = new Date();
  let hoursStart = ('0' + timeStart.getHours()).slice(-2);
  let minutesStart = ('0' + timeStart.getMinutes()).slice(-2);
  let secondsStart = ('0' + timeStart.getSeconds()).slice(-2);

  console.log(chalk.green(`Скачивание видео запущено в ${hoursStart}:${minutesStart}:${secondsStart}. Это займет какое-то время.\n`));
  await Promise.all(processList);

  let timeEnd = new Date();
  let hoursEnd = ('0' + timeEnd.getHours()).slice(-2);
  let minutesEnd = ('0' + timeEnd.getMinutes()).slice(-2);
  let secondsEnd = ('0' + timeEnd.getSeconds()).slice(-2);

  console.log(chalk.green(`\nЗагрузка завершена в ${hoursEnd}:${minutesEnd}:${secondsEnd}\n`));
};

(async () => {
    console.log(chalk.magenta('Coded by @limitedeternity. \n'));
    console.log(chalk.yellow('Внимание. Настоятельно рекомендуется использовать VPN, чтобы избежать проблем, возникающих во время бесчинств РКН.\n'));

    let linkList = linksReader();

    console.log(chalk.green('Запускаю проверку...\n'));
    let { isMp4Exists, isAuthFixed } = await situationChecker(linkList[0]);

    console.log(chalk.green('Проверка завершена.\n'));

    isAuthFixed ? authFixedDownloader({linkList: linkList, isMp4Exists: isMp4Exists}) : runDownloader({linkList: linkList, isMp4Exists: isMp4Exists});
})();
