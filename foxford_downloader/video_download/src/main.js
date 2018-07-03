const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const fs = require("fs");
const path = require("path");
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
        let erlyFronts = await browser.evaluate(() => document.querySelector('.full_screen').firstChild.src);

        await browser.goto(erlyFronts).wait('video > source');
        var lessonName = await browser.evaluate(() => document.querySelector('[class^="Header__name__"]').innerText);
        var m3u8Link = await browser.evaluate(() => document.querySelector("video > source").src);
        var mp4Link = m3u8Link
                        |> (m3u8Link => new URL(m3u8Link))
                        |> (urlObj => {
                              urlObj.pathname = urlObj
                                                  .pathname
                                                  .replace("hls.", "ms.")
                                                  .replace("master.m3u8", "mp4");
                              return urlObj;
                           })
                        |> (modUrlObj => modUrlObj.href)

        utils.logger.logDetails({ counter: counter, baseLink: link, mp4Link: mp4Link, m3u8Link: m3u8Link });

    } catch (err) {
        console.log(chalk.red('Обнаружена проблема при получении видео. Сообщите разработчику.'));
        console.log(`Трейсбек: \n ${err} \n`);
        process.exit(1);
    }

    processList.push(
      new Promise(async resolve => {
        let filename = `${slug(lessonName)}.mp4`;

        if (downloadMp4) {
          let { error, writedTo } = await utils.fetchContents({ url: mp4Link, downloadMp4: downloadMp4 });

          if (error) {
            console.log(chalk.yellow(`Загрузка файла ${filename} завершилась с ошибкой. \n Трейсбек: ${stderr}. \n Попробуйте перезапустить программу, использовав вместо "npm start" "npm run m3u8dl".`));

          } else {
            fs.renameSync(writedTo, path.join(process.cwd(), filename));
          }

        } else {
          let { error, writedTo } = await utils.fetchContents({ url: m3u8Link, downloadMp4: downloadMp4 });

          if (error) {
            console.log(chalk.yellow(`Загрузка плейлиста для ${filename} завершилась с ошибкой: ${error}`));

          } else {
            let { stderr, stdout } = await utils.executeCommand(`${ffmpegBin} -hide_banner -nostats -loglevel "error" -protocol_whitelist "file,http,https,tcp,tls,crypto" -i "${writedTo}" -bsf:a aac_adtstoasc -c copy -crf 18 ${path.join(process.cwd(), filename)}`);

            if (stderr) {
              console.log(chalk.yellow(`Загрузка файла ${filename} завершилась с ошибкой. \n Трейсбек: ${stderr}. \n Сообщите разработчику.`));
            }

            fs.unlinkSync(writedTo);
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
  process.exit(0);
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
