const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const Listr = require("listr");
const { Observable } = require("rxjs");
const ffmpeg = require("fluent-ffmpeg");
const utils = require("./utils");


let ffmpegBin = process.platform === 'win32'
                    ?
                    path.join(path.dirname(process.argv[0]), 'ffmpeg.exe')
                    :
                    path.join(path.dirname(process.argv[0]), 'ffmpeg');

let chromiumBin = process.platform === 'win32'
                    ?
                    path.join(path.dirname(process.argv[0]), 'chromium', 'chrome.exe')
                    :
                  process.platform === 'darwin'
                    ?
                    path.join(path.dirname(process.argv[0]), 'chromium', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
                    :
                    path.join(path.dirname(process.argv[0]), 'chromium', 'chrome');

let linksFile = path.join(path.dirname(process.argv[0]), 'links.txt');


let browser;
let page;
let accessToken;
let videoLinks;
let downloadTasks = [];

new Listr([
    {
        title: 'Setting up env',
        task: () => {
            require("events").EventEmitter.prototype._maxListeners = Infinity;

            fs.chmodSync(chromiumBin, 0o755);
            fs.chmodSync(ffmpegBin, 0o755);

            ffmpeg.setFfmpegPath(ffmpegBin);
        }
    },
    {
        title: 'Performing startup checks',
        task: () => {
            if (!fs.existsSync(linksFile)) {
                fs.closeSync(fs.openSync(linksFile, 'w'));
                throw new Error('Pass video links ("https://foxford.ru/groups/<id>") separated by newline to links.txt file');
            }

            videoLinks = fs.readFileSync(linksFile, 'utf8')
                             .replace(/\r\n/g, "\r")
                             .replace(/\n/g, "\r")
                             .split(/\r/)
                             .filter(Boolean)
                             |> (filteredList => new Set(filteredList))
                             |> (uniqueSet => [...uniqueSet])
                             |> (uniqueList => uniqueList.map(el => el.trim()));

            if (videoLinks.length === 0) {
                throw new Error('No links detected. Is links.txt empty?');
            }

            if (!videoLinks.every(el => { return /^https:\/\/foxford\.ru\/groups\/\d{5}$/.test(el) })) {
                throw new Error('Some links didn\'t pass regex check');
            }

            if (!utils.cliArgs['--login'] || !utils.cliArgs['--password']) {
                throw new Error('No auth data passed. Run program like this: "fdl --login=<your_login> --password=<your_password>"');
            }
        }
    },
    {
        title: 'Instantiating Chromium',
        task: async () => {
            browser = await puppeteer.launch({
                executablePath: chromiumBin,
                headless: true,
                slowMo: 0,
                args: [
                    '--proxy-server="direct://"',
                    '--proxy-bypass-list=*'
                ]
            });
        }
    },
    {
        title: 'Setting up page',
        task: async () => {
            page = await browser.newPage();
            await page.setRequestInterception(true);

            let blockedRes = ['image', 'stylesheet', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'];
            page.on('request', req => {
                if (blockedRes.includes(req.resourceType())) {
                    req.abort();

                } else {
                    req.continue();
                }
            });

            page.on('error', async err => {
                await browser.close();
                throw err;
            });
        }
    },
    {
        title: 'Logging in with provided credentials',
        task: async () => {
            let login = utils.cliArgs['--login'];
            let password = utils.cliArgs['--password'];

            await page.goto('https://foxford.ru/user/login?redirect=/dashboard', {
                waitUntil: 'domcontentloaded'
            });

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

            await utils.somePromise([
                page.waitForSelector("div[class^='PupilDashboard']"),
                page.waitForSelector("div[class^='TeacherDashboard']")
            ]);
        }
    },
    {
        title: 'Aquiring access token',
        task: async () => {
            await page.goto(videoLinks[0]);
            await page.waitForSelector('.full_screen > iframe');

            let erlyFronts = await page.evaluate(`document.querySelector('.full_screen > iframe').src;`);

            accessToken = new URL(erlyFronts)
                            |> (parsedLink => parsedLink.searchParams.get("access_token"));

            browser.close();
        }
    },
    {
        title: 'Creating download task list',
        task: () => {
            return new Observable(async currentTaskObserver => {
                for (let link of videoLinks) {
                    currentTaskObserver.next(link);

                    let groupId = link.match(/groups\/(\d{5})$/)[1];
                    let webinarId = Number(groupId) + 12000;
                    let streamUrl = `https://storage.netology-group.services/api/v1/buckets/hls.webinar.foxford.ru/sets/${webinarId}/objects/master.m3u8?access_token=${accessToken}`;

                    await utils.checkAvailability(streamUrl);

                    downloadTasks.push({
                        title: `${groupId.valueOf()}.mp4`,
                        task: () => {
                            return new Observable(async downloadTaskObserver => {
                                let destination = path.join(path.dirname(process.argv[0]), `${groupId.valueOf()}.mp4`);
                                let source = streamUrl.valueOf();

                                await new Promise((resolve, reject) => {
                                    let command = ffmpeg({ source })
                                                    .audioCodec('copy')
                                                    .videoCodec('copy')
                                                    .outputOptions([
                                                        '-bsf:a aac_adtstoasc',
                                                        '-preset superfast'
                                                    ])
                                                    .save(destination);

                                    command.on('start', () => {
                                        downloadTaskObserver.next('N/A [0 kbps]');
                                    });

                                    command.on('progress', progress => {
                                        downloadTaskObserver.next(`${progress.timemark} [${progress.currentKbps} kbps]`);
                                    });

                                    command.on('error', err => {
                                        reject(err);
                                    });

                                    command.on('end', () => {
                                        downloadTaskObserver.complete();
                                        resolve(true);
                                    });
                                });
                            });
                        }
                    });
                }

                currentTaskObserver.complete();
            });
        }
    },
    {
        title: 'Downloading',
        task: () => new Listr(downloadTasks, { concurrent: true, exitOnError: false })
    }
]).run();
