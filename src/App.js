import React, { useState } from "react";
import "./App.css";
import Input from "./Input";

function App() {
  const [edit, setEdit] = useState(false);
  return (
    <div className="App" onClick={() => setEdit(false)}>
      <h1>Goat Research</h1>
      <Input
        edit={edit}
        onClick={(e) => {
          e.stopPropagation();
          setEdit(true);
        }}
      />
    </div>
  );
}

export default App;
