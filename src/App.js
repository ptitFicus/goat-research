import React from "react";
import { Route } from "naive-router";
import "./App.css";
import Page from "./Page";

function App() {
  return (
    <div className="App">
      <h1>Goat Research</h1>
      <Route path="/keyword/{keyword}">
        {({ keyword }) => <Page name={keyword} />}
      </Route>
    </div>
  );
}

export default App;
