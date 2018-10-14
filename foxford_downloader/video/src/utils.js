const fs = require("fs");
const path = require("path");
const request = require("request");


module.exports = {
    cliArgs: process.argv.slice(2).reduce((acc, arg) => {
        let [k, v] = arg.split('=');
        acc[k] = v === undefined ? true : /true|false/.test(v) ? v === 'true' : /(^[-+]?\d+\.\d+$)|(?<=\s|^)[-+]?\d+(?=\s|$)/.test(v) ? Number(v) : v;
        return acc;
    }, {}),

    somePromise(promises) {
        let errors = [];

        return new Promise(async (resolve, reject) => {
            await Promise.race(promises.map(p => {
                return p.catch(err => {
                    errors.push(err);

                    if (errors.length >= promises.length) {
                        reject(errors);
                    }
                });
            }));

            resolve(true);
        });
    },

    checkAvailability(url) {
        return new Promise((resolve, reject) => {
            let r = request({
                method: 'GET',
                uri: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3563.0 Safari/537.36'
                }
            });

            r.on('response', response => {
                r.abort();

                if (String(response.statusCode).match(/^(4|5)\d{2}$/)) {
                    return reject(new Error(`Resource unavailable. Status: ${httpResponse.statusCode}.`));
                }

                return resolve(response.headers);
            });

            r.on('error', err => {
                r.abort();
                return reject(new Error(`Resource unavailable. Error: ${err}.`));
            });
        });
    }
};
