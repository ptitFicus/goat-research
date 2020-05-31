import React, { createRef, useReducer, useEffect } from "react";
import "./Input.css";

const TAB_KEY_CODE = 9;
const ENTER_TAB_CODE = 13;
const KEY_PRESSED = "KEY_PRESSED";
const VALUE_CHANGE = "VALUE_CHANGE";

const KEY_PROPAGATION_BLACKLIST = [TAB_KEY_CODE, ENTER_TAB_CODE];
const KEY_CODE_LIST = [TAB_KEY_CODE, ENTER_TAB_CODE];

function fieldReducer(
  { text, cursor } = {
    text: "",
    cursor: 0,
  },
  { type, code, position, value }
) {
  switch (type) {
    case VALUE_CHANGE:
      return {
        text: value,
        cursor: position,
      };
    case KEY_PRESSED:
      if (code === ENTER_TAB_CODE) {
        const untilNow = text.substring(0, position);
        const previousLineEnd = untilNow.lastIndexOf("\n");

        let indent = 0;
        const line = untilNow.substring(previousLineEnd + 1, position);
        for (let i = 0; i < line.length; i++, indent++) {
          if (line[i] !== " ") {
            break;
          }
        }
        const start = text.substring(0, position + 1);
        const end = text.substring(position + 1);
        return {
          text: `${start}\n${" ".repeat(indent)}${end}`,
          cursor: position + indent + 1,
        };
      } else if (code === TAB_KEY_CODE) {
        const start = text.substring(0, position);
        const end = text.substring(position);
        return {
          text: start + "  " + end,
          cursor: position + 2,
        };
      } else {
        return { text, cursor };
      }
    default:
      return { text, cursor };
  }
}

export default function Input({
  edit = false,
  onClick = () => {},
  text: currentText = "",
}) {
  const ref = createRef();
  let [{ text, cursor }, dispatch] = useReducer(fieldReducer, {
    text: currentText,
  });

  useEffect(() => {
    if (ref.current && cursor !== ref.current.selectionStart) {
      ref.current.selectionStart = cursor;
      ref.current.selectionEnd = cursor;
    }
  }, [cursor, ref]);

  let child;
  if (edit) {
    child = (
      <textarea
        ref={ref}
        onChange={(e) => {
          dispatch({
            type: VALUE_CHANGE,
            value: e.target.value,
            position: e.target.selectionStart,
          });
        }}
        onKeyDown={(e) => {
          if (KEY_CODE_LIST.includes(e.keyCode)) {
            dispatch({
              type: KEY_PRESSED,
              code: e.keyCode,
              position: e.target.selectionStart,
            });
          }

          if (KEY_PROPAGATION_BLACKLIST.includes(e.keyCode)) {
            e.preventDefault();
          }
        }}
        value={text}
      />
    );
  } else {
    child = (
      <div dangerouslySetInnerHTML={{ __html: textToDisplay(text) }}></div>
    );
  }

  return (
    <div className="Input" onClick={onClick}>
      {child}
    </div>
  );
}

function textToDisplay(text) {
  return text.split("").reduce(
    ({ content, ul }, next) => {
      if (next === "*" && !ul) {
        return { content: content + "<ul><li>", ul: true };
      } else if (next === "\n" && ul) {
        return { content: content + "</li></ul><br>", ul: false };
      } else if (next === "\n") {
        return { content: content + "<br>" + next, ul: false };
      }

      return { content: content + next, ul: ul };
    },
    { content: "", ul: false }
  ).content;
}
