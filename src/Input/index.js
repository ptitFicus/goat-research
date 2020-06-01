import React, { createRef, useReducer, useEffect, useState } from "react";
import "./Input.css";

const TAB_KEY_CODE = 9;
const ENTER_TAB_CODE = 13;
const KEY_PRESSED = "KEY_PRESSED";
const VALUE_CHANGE = "VALUE_CHANGE";

const KEY_PROPAGATION_BLACKLIST = [TAB_KEY_CODE, ENTER_TAB_CODE];
const KEY_CODE_LIST = [TAB_KEY_CODE, ENTER_TAB_CODE];

function fieldReducer(
  { text, cursor } = {
    text: "*",
    cursor: 0,
  },
  { type, code, position, value, shift }
) {
  switch (type) {
    case VALUE_CHANGE:
      return {
        text: value,
        cursor: position,
      };
    case KEY_PRESSED:
      if (code === ENTER_TAB_CODE) {
        const indent = currentLineIndetation(text, position);
        const start = text.substring(0, position);
        const end = text.substring(position);
        return {
          text: `${start}\n${" ".repeat(indent)}*${end}`,
          cursor: position + indent + 2,
        };
      } else if (code === TAB_KEY_CODE && !shift) {
        const lineStart = lineStartPosition(text, position);
        const start = text.substring(0, lineStart);
        const end = text.substring(lineStart);
        const currentIndentation = currentLineIndetation(text, position);
        const previousIndentation = previousLineIndentation(text, position);
        if (currentIndentation <= previousIndentation) {
          return {
            text: `${start}  ${end}`,
            cursor: position + 2,
          };
        } else {
          return { text, cursor };
        }
      } else if (code === TAB_KEY_CODE && shift) {
        const currentIndentation = currentLineIndetation(text, position);
        if (currentIndentation === 0) {
          return { text, cursor };
        }
        const lineStart = lineStartPosition(text, position);
        const start = text.substring(0, lineStart);
        const end = text.substring(lineStart);
        return {
          text: `${start}${unindent(end)}`,
          cursor: position - 2,
        };
      } else {
        return { text, cursor };
      }
    default:
      return { text, cursor };
  }
}

function unindent(line) {
  return line.replace("  ", "");
}

function previousLineIndentation(text, position) {
  const lineStart = lineStartPosition(text, position);
  const previousLineStart = lineStart - 1;
  if (previousLineStart === -1) {
    return 0;
  }

  return currentLineIndetation(text, previousLineStart);
}

function currentLineIndetation(text, position) {
  let indent = 0;
  const line = currentLineUntilCursor(text, position);
  for (let i = 0; i < line.length; i++, indent++) {
    if (line[i] !== " ") {
      break;
    }
  }
  return indent;
}

function lineStartPosition(text, position) {
  const untilNow = text.substring(0, position);
  return untilNow.lastIndexOf("\n") + 1;
}

function currentLineUntilCursor(text, position) {
  const untilNow = text.substring(0, position);
  const previousLineEnd = untilNow.lastIndexOf("\n");
  return untilNow.substring(previousLineEnd + 1, position);
}

function removeFirstStar(line) {
  return line.replace("*", "");
}

export default function Input({ text: currentText, onChange = () => {} }) {
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

  const [edit, setEdit] = useState(false);

  useEffect(() => {
    const callback = () => {
      setEdit(false);
    };
    document.addEventListener("click", callback);

    return () => document.removeEventListener("click", callback);
  }, []);

  useEffect(() => {
    onChange(text);
  }, [text, onChange]);

  useEffect(() => {
    dispatch({ type: VALUE_CHANGE, value: currentText });
  }, [currentText]);

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
              shift: e.shiftKey,
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
    <div
      className="Input"
      onClick={(e) => {
        e.stopPropagation();
        // https://stackoverflow.com/questions/24415631/reactjs-syntheticevent-stoppropagation-only-works-with-react-events
        e.nativeEvent.stopImmediatePropagation();
        setEdit(true);
      }}
    >
      {child}
    </div>
  );
}

function textToDisplay(text) {
  return (
    text.split("\n").reduce(
      ({ content, ul }, line) => {
        const indentation = currentLineIndetation(line, line.length - 1);
        let cleanedLine = replacePageReferences(removeFirstStar(line));
        if (indentation / 2 > ul) {
          return {
            content: `${content}<ul><li>${cleanedLine}</li>`,
            ul: ul + 1,
          };
        } else if (indentation / 2 < ul) {
          return {
            content: `${content}</ul><li>${cleanedLine}</li>`,
            ul: ul - 1,
          };
        } else {
          return { content: `${content}<li>${cleanedLine}</li>`, ul: ul };
        }
      },
      { content: "<ul>", ul: 0 }
    ).content + "</ul>"
  );
}

function replacePageReferences(str) {
  const regexp = /\[(?<pageName>.+?)\]/g;

  return str.replace(regexp, function (matched, pageName) {
    return `<a href="/keyword/${pageName}">${pageName}</a>`;
  });
}
