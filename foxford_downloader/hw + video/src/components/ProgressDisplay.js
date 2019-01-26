import React, { Component } from "react";
import "./ProgressDisplay.css";

class ProgressDisplay extends Component {
  render() {
    return (
      <div id="progressDisplay">
        <h1>
          Please wait. App will exit automatically when all operations will be
          finished.
        </h1>
      </div>
    );
  }
}

export default ProgressDisplay;
