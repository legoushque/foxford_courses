import React, { Component } from "react";
import "./FoxFrame.css";

class FoxFrame extends Component {
  render() {
    return (
      <iframe
        id="foxFrame"
        title="foxFrame"
        allowFullScreen
        frameBorder="0"
        referrerPolicy="no-referrer"
        src="https://foxford.ru/user/login?redirect=/dashboard"
      />
    );
  }
}

export default FoxFrame;
