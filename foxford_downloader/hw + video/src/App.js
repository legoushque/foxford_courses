import React, { Component } from "react";
import FoxFrame from "./components/FoxFrame";
import ProgressDisplay from "./components/ProgressDisplay";

import FoxfordRetriever from "./runtime";
import helpers from "./runtime/helpers";

class App extends Component {
  constructor(props) {
    super(props);

    nw.Window.get().on("close", () => {
      nw.App.quit();
    });
  }

  async componentDidMount() {
    let mainFrame = await helpers.waitFor(() =>
      window.top.document.getElementById("foxFrame")
    );

    let progDisp = await helpers.waitFor(() =>
      window.top.document.getElementById("progressDisplay")
    );

    let waitResult = await helpers.waitFor(() =>
      mainFrame.contentWindow.location.href.match(
        /^https:\/\/foxford\.ru\/courses\/(\d+)$/
      )
    );

    mainFrame.style.display = "none";
    progDisp.style.display = "block";

    let fdl = new FoxfordRetriever({
      courseId: waitResult[1],
      foxFrame: mainFrame
    });

    await fdl.run();
    nw.Window.get().close();
  }

  render() {
    return (
      <div>
        <FoxFrame />
        <ProgressDisplay />
      </div>
    );
  }
}

export default App;
