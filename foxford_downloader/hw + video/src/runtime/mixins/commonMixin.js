class CommonMixin {
  constructor() {
    this.lessonList = [];
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
}

export default CommonMixin;
