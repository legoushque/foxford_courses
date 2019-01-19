import fs from "fs-extra";
import path from "path";
import axios from "axios";
import whenDomReady from "when-dom-ready";

/*

*/

import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";

ReactDOM.render(<App />, document.getElementById("root"));

nw.Window.get().on("close", () => {
  nw.App.quit();
});

/*


*/

const foxFrame = window.top.document.getElementById("foxFrame");

function waitFor(condition, callback) {
  let returnedResult = condition();

  if (!returnedResult) {
    window.setTimeout(waitFor.bind(null, condition, callback), 1000);
  } else {
    callback(returnedResult);
  }
}

waitFor(
  () =>
    foxFrame.contentWindow.location.href.match(
      /^https:\/\/foxford\.ru\/courses\/(\d+)$/
    ),
  async returnedResult => {
    let fdl = new FoxfordRetriever(returnedResult[1]);

    await fdl.run();
    nw.Window.get().close();
  }
);

class FoxfordRetriever {
  constructor(courseId) {
    this.courseId = courseId;
    this.lessonList = [];
    this.downloadList = [];
    this.accessToken = null;
  }

  async run() {
    await this.createLessonList();
    await this.createDownloadList();
    await this.download();
  }

  async createLessonList() {
    let response = await fetch(
      `https://foxford.ru/api/courses/${this.courseId}/lessons`
    );

    let json = await response.json();

    let cursorAfter = json.cursors.after;
    let cursorBefore = json.cursors.before;

    this.lessonList = [...json.lessons];

    while (cursorBefore) {
      response = await fetch(
        `https://foxford.ru/api/courses/${
          this.courseId
        }/lessons?before=${cursorBefore}`
      );

      json = await response.json();

      this.lessonList = [...this.lessonList, ...json.lessons];
      cursorBefore = json.cursors.before;
    }

    while (cursorAfter) {
      response = await fetch(
        `https://foxford.ru/api/courses/${
          this.courseId
        }/lessons?after=${cursorAfter}`
      );

      json = await response.json();

      this.lessonList = [...this.lessonList, ...json.lessons];
      cursorAfter = json.cursors.after;
    }
  }

  async createDownloadList() {
    for (let lesson of this.lessonList) {
      let id = lesson.id;

      let response = await fetch(
        `https://foxford.ru/api/courses/${this.courseId}/lessons/${id}`
      );

      let json = await response.json();

      if (json.webinar_status !== "video_available") {
        continue;
      }

      let webinar_id = json.webinar_id;

      if (json.access_state === "available") {
        foxFrame.contentWindow.location.href = `https://foxford.ru/groups/${webinar_id}`;

        await new Promise(resolve => {
          whenDomReady(resolve, foxFrame.contentWindow.document);
        });

        let erlyFrame = foxFrame.contentWindow.document.querySelector(
          "div.full_screen > iframe"
        );

        await new Promise(async resolveMain => {
          while (!erlyFrame) {
            erlyFrame = foxFrame.contentWindow.document.querySelector(
              "div.full_screen > iframe"
            );

            await new Promise(resolve => setTimeout(resolve, 500));
          }

          await new Promise(resolve => {
            whenDomReady(resolve, erlyFrame.contentWindow.document);
          });

          resolveMain();
        });

        if (lesson.type === "intro") {
          this.accessToken = new URL(erlyFrame.src).searchParams.get(
            "access_token"
          );
        }

        let videoEl = erlyFrame.contentWindow.document.querySelector(
          "video.video-react-video > source"
        );

        await new Promise(async resolveMain => {
          while (!videoEl) {
            videoEl = erlyFrame.contentWindow.document.querySelector(
              "video.video-react-video > source"
            );

            await new Promise(resolve => setTimeout(resolve, 500));
          }

          resolveMain();
        });

        this.downloadList.push({
          url: videoEl.src,
          fname: `${lesson.title || webinar_id}.m3u8`
        });
      } else {
        let video_id = webinar_id + 12000;

        this.downloadList.push({
          url: `https://storage.netology-group.services/api/v1/buckets/hls.webinar.foxford.ru/sets/${video_id}/objects/master.m3u8?access_token=${
            this.accessToken
          }`,
          fname: `${lesson.title || webinar_id}.m3u8`
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }

  async download() {
    for (let { url, fname } of this.downloadList) {
      let outPath = path.join(
        nw.App.startPath,
        "output",
        `${this.courseId}`,
        fname
      );

      try {
        let response = await axios({
          method: "GET",
          url
        });

        fs.ensureFileSync(outPath);
        fs.writeFileSync(outPath, response.data);
      } catch (e) {
        continue;
      }
    }
  }
}
