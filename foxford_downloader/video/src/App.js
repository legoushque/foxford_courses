import React, { Component } from "react";
import "./App.css";

class App extends Component {
  render() {
    return (
      <div>
        <iframe
          id="foxFrame"
          title="foxFrame"
          allowFullScreen
          frameBorder="0"
          referrerPolicy="no-referrer"
          src="https://foxford.ru/user/login?redirect=/dashboard"
        />
      </div>
    );
  }
}

export default App;
