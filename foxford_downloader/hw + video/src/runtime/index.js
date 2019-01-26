import mixObj from "./mixins";
const { mix, mixins } = mixObj;

class FoxfordRetrieverBase {
  constructor({ courseId, foxFrame }) {
    this.courseId = courseId;
    this.foxFrame = foxFrame;
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
}

class FoxfordRetriever extends mix(FoxfordRetrieverBase).with(...mixins) {}

export default FoxfordRetriever;
