import path from "path";
import axios from "axios";
import whenDomReady from "when-dom-ready";
import helpers from "../helpers";

class VideoMixin {
  constructor() {
    this.accessToken = null;
    this.videoList = [];
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
        this.foxFrame.contentWindow.location.href = `https://foxford.ru/groups/${webinar_id}`;

        await whenDomReady(this.foxFrame.contentWindow.document);

        let erlyFrame = await helpers.waitFor(() =>
          this.foxFrame.contentWindow.document.querySelector(
            "div.full_screen > iframe"
          )
        );

        await whenDomReady(erlyFrame.contentWindow.document);

        if (lesson.type === "intro") {
          this.accessToken = new URL(erlyFrame.src).searchParams.get(
            "access_token"
          );
        }

        let videoEl = await helpers.waitFor(() =>
          erlyFrame.contentWindow.document.querySelector(
            "video.video-react-video > source"
          )
        );

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

        helpers.writeFile(outPath, response.data);
      } catch (e) {
        continue;
      }
    }
  }
}

export default VideoMixin;
