import path from "path";
import homeworkTemplate from "../homeworkTemplate";
import whenDomReady from "when-dom-ready";
import helpers from "../helpers";

class HomeworkMixin {
  constructor() {
    this.homeworkList = [];
  }

  async createHomeworkList() {
    for (let lesson of this.lessonList) {
      let response = await fetch(
        `https://foxford.ru/api/lessons/${lesson.id}/tasks`
      );

      let json = await response.json();

      if (json) {
        json.forEach(task => {
          let modTask = task;

          modTask.lessonId = lesson.id;
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

      this.foxFrame.contentWindow.location.href = `https://foxford.ru/lessons/${lessonId}/tasks/${taskId}`;
      await whenDomReady(this.foxFrame.contentWindow.document);

      await fetch(
        `https://foxford.ru/api/lessons/${lessonId}/tasks/${taskId}/fails`,
        {
          method: "POST",
          headers: {
            "X-CSRF-Token": helpers.getCookie(
              "csrf_token",
              this.foxFrame.contentWindow.document.cookie
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

      helpers.writeFile(outPath, homeworkTemplate(json));
    }
  }
}

export default HomeworkMixin;
