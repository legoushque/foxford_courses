import fs from "fs-extra";
import path from "path";

const helpers = {
  waitFor(condition) {
    return new Promise(async resolve => {
      let returnedResult;

      while (!returnedResult) {
        try {
          returnedResult = condition();
        } catch (e) {
          returnedResult = null;
        }

        if (!returnedResult) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      resolve(returnedResult);
    });
  },

  writeFile(file, data) {
    if (fs.existsSync(file)) {
      let newfname = path.parse(file);

      newfname.name += "0";
      newfname.base = newfname.name + newfname.ext;

      return this.writeFile(path.format(newfname), data);
    }

    fs.ensureFileSync(file);
    fs.writeFileSync(file, data);
  },

  getCookie(cookiename, cookie) {
    let cookiestring = RegExp("" + cookiename + "[^;]+").exec(cookie);

    return decodeURIComponent(
      !!cookiestring ? cookiestring.toString().replace(/^[^=]+./, "") : ""
    );
  }
};

export default helpers;
