const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const { Chromeless } = require("chromeless");
const chalk = require("chalk");
const query = require("cli-interact").getYesNo;
const slug = require("slug");

var ffmpegBin = ffmpeg.path;
var utils = require("./utils");

const download = async ({ linkList, downloadMp4 }) => {
  let browser = new Chromeless({
      scrollBeforeClick: true,
      launchChrome: true,
      waitTimeout: 10000 * 1000 // 10k seconds
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
    console.log(chalk.blue(`Готовлюсь к добавлению в очередь видео по ссылке #${counter + 1}...`));

    try {
        await browser.goto(link).wait('.full_screen');
        var erlyFronts = await browser.evaluate(() => document.querySelector('.full_screen').firstChild.src);
        var erlyOrigin = new URL(erlyFronts).origin;

        await browser.goto(erlyFronts).wait('video > source');
        var lessonName = await browser.evaluate(() => document.querySelector('[class^="Header__name__"]').innerText);
        var m3u8Link = await browser.evaluate(() => document.querySelector("video > source").src);
        var mp4Link = m3u8Link
                        |> (m3u8Link => new URL(m3u8Link))
                        |> (urlObj => {
                              urlObj.pathname = urlObj
                                                  .pathname
                                                  .replace("hls.", "ms.")
                                                  .replace(".master.m3u8", ".mp4");
                              return urlObj;
                           })
                        |> (modUrlObj => modUrlObj.href)

        utils.logger.logLine({ counter: counter, baseLink: link, mp4Link: mp4Link, m3u8Link: m3u8Link });

    } catch (err) {
        console.log(chalk.red('Обнаружена проблема при получении видео. Сообщите разработчику.'));
        console.log(`Трейсбек: \n ${err} \n`);
        process.exit(1);
    }

    processList.push(
      new Promise(async resolve => {
        let filename = `${slug(lessonName)}.mp4`;

        if (downloadMp4) {
          let { stderr, stdout } = await utils.executeCommand(`${ffmpegBin} -hide_banner -nostats -loglevel error -multiple_requests 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 30 -headers "Referer: ${erlyFronts}" -headers "Origin: ${erlyOrigin}" -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.62 Safari/537.36" -i "${mp4Link}" -c copy ${filename}`);

          if (stderr) {
            console.log(chalk.yellow(`Загрузка файла ${filename} завершилась с ошибкой. \n Трейсбек: ${stderr}. \n Попробуйте перезапустить программу, использовав вместо "npm start" "npm run m3u8dl".`));
          }

        } else {
          let { stderr, stdout } = await utils.executeCommand(`${ffmpegBin} -hide_banner -nostats -loglevel error -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 30 -headers "Referer: ${erlyFronts}" -headers "Origin: ${erlyOrigin}" -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.62 Safari/537.36" -i "${m3u8Link}" -bsf:a aac_adtstoasc -c copy ${filename}`);

          if (stderr) {
            console.log(chalk.yellow(`Загрузка файла ${filename} завершилась с ошибкой. \n Трейсбек: ${stderr}. \n Сообщите разработчику.`));
          }
        }

        resolve(filename);

      }).then(filename => {
        console.log(chalk.green(`${filename} ...✓`));
      })
    );

    console.log(chalk.green(`Видео #${counter + 1} добавлено в очередь! Будет сохранено в ${slug(lessonName)}.mp4\n`));
  }

  await browser.end();
  console.log(chalk.yellow("Логи работы программы сохранены в log.txt. Вы можете воспользоваться информацией из этого файла, если решите сохранить видео вручную."));

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

  console.log(chalk.green(`\nЗагрузка завершена в ${hoursEnd}:${minutesEnd}:${secondsEnd}\n`));
};

(() => {
    console.log(chalk.magenta('Coded by @limitedeternity.\n'));
    console.log(chalk.yellow('Внимание. Настоятельно рекомендуется использовать VPN, чтобы избежать проблем, возникающих во время бесчинств РКН.\n'));

    require("events").EventEmitter.prototype._maxListeners = 50;

    utils.logger.reset();
    utils.linkReader.promptLinks();

    if (utils.cliArgs.hasOwnProperty('--m3u8')) {
      download({ linkList: utils.linkReader.linkList, downloadMp4: false });

    } else {
      download({ linkList: utils.linkReader.linkList, downloadMp4: true });
    }

})();
