import React, { useState, createRef, useEffect } from "react";
import "./Input.css";

const TAB_KEY_CODE = 9;

export default function Input({
  edit = false,
  onClick = () => {},
  text: currentText = "",
}) {
  let [text, setText] = useState(currentText);
  let [cursor, setCursor] = useState(-1);
  const ref = createRef();
  useEffect(() => {
    if (ref && ref.current && cursor > -1) {
      ref.current.selectionStart = ref.current.selectionEnd = cursor;
    }
  }, [cursor, ref]);

  let child;
  if (edit) {
    console.log("focus");
    child = (
      <textarea
        ref={ref}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          const field = e.target;

          if (e.keyCode === TAB_KEY_CODE) {
            const start = field.selectionStart;
            setText(text.substring(0, start) + "  " + text.substring(start));
            setCursor(start + 2);
            //field.selectionStart = field.selectionEnd = start + 1;

            e.preventDefault();
          } else {
            setCursor(-1);
          }
        }}
        value={text}
      />
    );
  } else {
    child = <div>{textToDisplay(text)}</div>;
  }

  return (
    <div className="Input" onClick={onClick}>
      {child}
    </div>
  );
}

function textToDisplay(text) {
  return text;
}