import fs from "fs-extra";
import path from "path";
import axios from "axios";
import whenDomReady from "when-dom-ready";

/*

*/

import homeworkTemplate from "./runtime/homeworkTemplate";

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
    this.accessToken = null;
    this.videoList = [];

    this.lessonList = [];
    this.homeworkList = [];
  }

  writeFile(file, data) {
    if (fs.existsSync(file)) {
      let newfname = path.parse(file);

      newfname.name += "0";
      newfname.base = newfname.name + newfname.ext;

      return this.writeFile(path.format(newfname), data);
    }

    fs.ensureFileSync(file);
    fs.writeFileSync(file, data);
  }

  getCookie(cookiename, cookie) {
    let cookiestring = RegExp("" + cookiename + "[^;]+").exec(cookie);

    return decodeURIComponent(
      !!cookiestring ? cookiestring.toString().replace(/^[^=]+./, "") : ""
    );
  }

  async run() {
    // @TODO: Maybe some progress display?

    await this.createLessonList();

    /*
    @TODO: Algorithm for homework display (~40% done)

    await this.createHomeworkList();
    await this.retrieveHomework();
    */

    await this.createVideoList();
    await this.retrieveVideos();
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

  async createHomeworkList() {
    for (let lesson of this.lessonList) {
      let id = lesson.id;

      let response = await fetch(`https://foxford.ru/api/lessons/${id}/tasks`);
      let json = await response.json();

      if (json) {
        json.forEach(task => {
          let modTask = task;

          modTask.lessonId = id;
          this.homeworkList.push(modTask);
        });
      }
    }
  }

  async retrieveHomework() {
    for (let task of this.homeworkList) {
      let taskId = task.id;
      let lessonId = task.lessonId;

      try {
        let response = await fetch(
          `https://foxford.ru/api/lessons/${lessonId}/tasks/${taskId}`
        );

        if (!response.ok) {
          throw new Error("Homework unavaliable");
        }
      } catch (e) {
        break;
      }

      foxFrame.contentWindow.location.href = `https://foxford.ru/lessons/${lessonId}/tasks/${taskId}`;

      await new Promise(resolve => {
        whenDomReady(resolve, foxFrame.contentWindow.document);
      });

      await fetch(
        `https://foxford.ru/api/lessons/${lessonId}/tasks/${taskId}/fails`,
        {
          method: "POST",
          headers: {
            "X-CSRF-Token": this.getCookie(
              "csrf_token",
              foxFrame.contentWindow.document.cookie
            )
          }
        }
      );

      let response = await fetch(
        `https://foxford.ru/api/lessons/${lessonId}/tasks/${taskId}`
      );

      let json = await response.json();

      let outPath = path.join(
        nw.App.startPath,
        "output",
        String(this.courseId),
        String(lessonId),
        "homework",
        `${json.name}.html`
      );

      this.writeFile(outPath, homeworkTemplate(json));
    }
  }

  async createVideoList() {
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

        this.videoList.push({
          url: videoEl.src,
          lessonId: id,
          fname: `${lesson.title || webinar_id}.m3u8`
        });
      } else {
        let video_id = webinar_id + 12000;

        this.videoList.push({
          url: `https://storage.netology-group.services/api/v1/buckets/hls.webinar.foxford.ru/sets/${video_id}/objects/master.m3u8?access_token=${
            this.accessToken
          }`,
          lessonId: id,
          fname: `${lesson.title || webinar_id}.m3u8`
        });
      }
    }
  }

  async retrieveVideos() {
    for (let video of this.videoList) {
      let outPath = path.join(
        nw.App.startPath,
        "output",
        String(this.courseId),
        String(video.lessonId),
        video.fname
      );

      try {
        /*
        @TODO: ffmpeg with progress (maybe Listr + ffmpeg-downloader + fluent-ffmpeg?)
        */

        let response = await axios({
          method: "GET",
          url: video.url
        });

        this.writeFile(outPath, response.data);
      } catch (e) {
        continue;
      }
    }
  }
}
