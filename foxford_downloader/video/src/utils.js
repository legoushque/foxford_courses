const fs = require("fs");
const path = require("path");


module.exports = {
    cliArgs: process.argv.slice(2).reduce((acc, arg) => {
        let [k, v] = arg.split('=');
        acc[k] = v === undefined ? true : /true|false/.test(v) ? v === 'true' : /(^[-+]?\d+\.\d+$)|(?<=\s|^)[-+]?\d+(?=\s|$)/.test(v) ? Number(v) : v;
        return acc;
    }, {}),

    anyPromise(promises) {
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
    }
};
