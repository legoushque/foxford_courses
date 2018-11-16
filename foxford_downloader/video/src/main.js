const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const Listr = require("listr");
const { Observable } = require("rxjs");
const ffmpeg = require("fluent-ffmpeg");
const utils = require("./utils");


new Listr([
    {
        title: 'Setting up context',
        task: ctx => {
            ctx.ffmpegBin = process.platform === 'win32'
                                ?
                                path.join(path.dirname(process.argv[0]), 'ffmpeg.exe')
                                :
                                path.join(path.dirname(process.argv[0]), 'ffmpeg');

            ctx.chromiumBin = process.platform === 'win32'
                                ?
                                path.join(path.dirname(process.argv[0]), 'chromium', 'chrome.exe')
                                :
                              process.platform === 'darwin'
                                ?
                                path.join(path.dirname(process.argv[0]), 'chromium', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
                                :
                                path.join(path.dirname(process.argv[0]), 'chromium', 'chrome');

            ctx.linksFile = path.join(path.dirname(process.argv[0]), 'links.txt');
        }
    },
    {
        title: 'Setting up parameters',
        task: ctx => {
            if (!utils.cliArgs['--login'] || !utils.cliArgs['--password']) {
                throw new Error('No auth data passed. Run program like this: "fdl --login=<your_login> --password=<your_password>"');
            }

            require("events").EventEmitter.prototype._maxListeners = Infinity;

            fs.chmodSync(ctx.chromiumBin, 0o755);
            fs.chmodSync(ctx.ffmpegBin, 0o755);

            ffmpeg.setFfmpegPath(ctx.ffmpegBin.valueOf());
        }
    },
    {
        title: 'Getting webinar link list and validating it',
        task: ctx => {
            if (!fs.existsSync(ctx.linksFile)) {
                fs.closeSync(fs.openSync(ctx.linksFile, 'w'));
                throw new Error('Pass video links ("https://foxford.ru/groups/<id>") separated by newline to links.txt file');
            }

            ctx.videoLinks = fs.readFileSync(ctx.linksFile, 'utf8')
                             .replace(/\r\n/g, "\r")
                             .replace(/\n/g, "\r")
                             .split(/\r/)
                             .filter(Boolean)
                             |> (filteredList => new Set(filteredList))
                             |> (uniqueSet => [...uniqueSet])
                             |> (uniqueList => uniqueList.map(el => el.trim()));

            if (ctx.videoLinks.length === 0) {
                throw new Error('No links detected. Is links.txt empty?');
            }

            if (!ctx.videoLinks.every(el => { return /^https:\/\/foxford\.ru\/groups\/\d{5}$/.test(el) })) {
                throw new Error('Some links didn\'t pass regex check');
            }
        }
    },
    {
        title: 'Launching browser window',
        task: async ctx => {
            ctx.browser = await puppeteer.launch({
                executablePath: ctx.chromiumBin,
                headless: true,
                slowMo: 0,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--proxy-server="direct://"',
                    '--proxy-bypass-list=*'
                ]
            });
        }
    },
    {
        title: 'Preparing browser page',
        task: async ctx => {
            ctx.page = await ctx.browser.newPage();
            await ctx.page.setRequestInterception(true);

            let blockedRes = ['image', 'stylesheet', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'];
            ctx.page.on('request', req => {
                if (blockedRes.includes(req.resourceType())) {
                    req.abort();

                } else {
                    req.continue();
                }
            });

            ctx.page.on('error', async err => {
                await ctx.browser.close();
                throw err;
            });
        }
    },
    {
        title: 'Navigating to foxford.ru login page',
        task: async ctx => {
            await ctx.page.goto('https://foxford.ru/user/login?redirect=/dashboard', {
                waitUntil: 'domcontentloaded'
            });
        }
    },
    {
        title: 'Logging in with provided credentials',
        task: async ctx => {
            let login = utils.cliArgs['--login'];
            let password = utils.cliArgs['--password'];

            await ctx.page.evaluate(`
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
                ctx.page.waitForSelector("div[class^='PupilDashboard']"),
                ctx.page.waitForSelector("div[class^='TeacherDashboard']")
            ]);
        }
    },
    {
        title: 'Aquiring download metadata',
        task: ctx => {
            return new Observable(async currentTaskObserver => {
                ctx.linkMetadata = [];

                for (let link of ctx.videoLinks) {
                    currentTaskObserver.next(link);

                    await ctx.page.goto(link);
                    await ctx.page.waitForSelector('.full_screen > iframe');

                    let erlyFronts = await ctx.page.evaluate(`document.querySelector('.full_screen > iframe').src;`);

                    new URL(erlyFronts)
                                |> (parsedLink => {
                                    ctx.linkMetadata.push(
                                        {
                                            accessToken: parsedLink.searchParams.get("access_token").valueOf(),
                                            webinarId: parsedLink.searchParams.get("conf").valueOf().replace("webinar-", ""),
                                            groupId: link.match(/groups\/(\d{5})$/)[1].valueOf()
                                        }
                                    );
                                });
                }

                currentTaskObserver.complete();
            });
        }
    },
    {
        title: 'Stopping browser window and cleaning up context',
        task: async ctx => {
            await ctx.browser.close();

            for (let contextKey of Object.keys(ctx)) {
                if (contextKey !== "linkMetadata") {
                    delete ctx[contextKey];
                }
            }
        }
    },
    {
        title: 'Creating download task list',
        task: ctx => {
            return new Observable(async currentTaskObserver => {
                ctx.downloadTasks = [];

                for (let metadata of ctx.linkMetadata) {
                    currentTaskObserver.next(metadata.groupId);

                    let streamUrl = `https://storage.netology-group.services/api/v1/buckets/hls.webinar.foxford.ru/sets/${metadata.webinarId}/objects/master.m3u8?access_token=${metadata.accessToken}`;

                    await utils.checkAvailability(streamUrl);

                    ctx.downloadTasks.push({
                        title: `${metadata.groupId.valueOf()}.mp4`,
                        task: () => {
                            return new Observable(async downloadTaskObserver => {
                                let destination = path.join(path.dirname(process.argv[0]), `${metadata.groupId.valueOf()}.mp4`);
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
        task: ctx => new Listr(ctx.downloadTasks, { concurrent: true })
    },
    {
        title: 'Finishing',
        task: () => Promise.resolve(true)
    }
]).run();
