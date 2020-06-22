import React, { createRef, useReducer, useEffect, useState } from "react";
import "./Input.css";

const TAB_KEY_CODE = 9;
const ENTER_TAB_CODE = 13;
const KEY_PRESSED = "KEY_PRESSED";
const VALUE_CHANGE = "VALUE_CHANGE";
const LINK_REGEXP = /\[(?<pageName>.+?)\]/g;

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

function unindentFull(line) {
  return line.replace(/^ {2}/g, "");
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

  const textRef = createRef();
  useEffect(() => {
    textRef.current = text;
  }, [text, textRef]);

  useEffect(() => {
    const callback = () => {
      saveRefs(textRef.current);
      setEdit(false);
    };
    document.addEventListener("click", callback);

    return () => document.removeEventListener("click", callback);
  }, [textRef]);

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
      <div
        dangerouslySetInnerHTML={{
          __html: createHtmlDisplay(buildSyntaxicTree(text)),
        }}
      ></div>
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

function saveRefs(text) {
  console.log("Saving refs for text", text);
  const tree = buildSyntaxicTree(text);
  console.log("Tree", tree);
}

function buildSyntaxicTree(text) {
  const rootNode = { children: [], parent: null, pageReferences: new Set() };
  const leaf = text.split("\n").reduce(
    ({ currentLevel, node }, line) => {
      const indentation = currentLineIndetation(line, line.length - 1);
      const level = indentation / 2;
      let newNode = { text: line };
      if (level === currentLevel) {
        const parent = node.parent;
        newNode = { ...newNode, parent, children: [] };
        parent.children.push(newNode);
      } else if (level < currentLevel) {
        const diff = currentLevel - level;
        let parent = node.parent.parent;
        for (let i = diff - 1; i > 0; i--) {
          // -1 parce qu'on est déjà remonté d'un cran
          parent = parent.parent;
        }
        newNode = { ...newNode, parent, children: [] };
        parent.children.push(newNode);
      } else if (level > currentLevel) {
        newNode = { ...newNode, parent: node, children: [] };
        newNode.parent.children.push(newNode);
      }

      newNode.pageReferences = extractPageReferences(line);
      const parentPageReferences = listParentPageReferences(newNode);
      parentPageReferences.forEach((e) => newNode.pageReferences.delete(e));

      return { currentLevel: level, node: newNode };
    },
    { currentLevel: -1, node: rootNode }
  );

  let root = leaf.node;
  for (; root.parent; root = root.parent) {}
  return root;
}

function listParentPageReferences(node) {
  const refs = new Set();
  for (
    let currentNode = node.parent;
    currentNode.parent;
    currentNode = currentNode.parent
  ) {
    currentNode.pageReferences.forEach((e) => refs.add(e));
  }

  return refs;
}

function createHtmlDisplay({ children, text }, html = "") {
  let newHtml = html;
  if (text) {
    newHtml += `<li>${replacePageReferences(
      removeFirstStar(unindentFull(text))
    )}</li>`;
  }

  if (children && children.length > 0) {
    const childrenTexts = children.map((child) =>
      createHtmlDisplay(child, html)
    );
    newHtml += `<ul>${childrenTexts.join("")}</ul>`;
  }

  return newHtml;
}

function extractPageReferences(str) {
  let result;
  const matches = new Set();
  do {
    result = LINK_REGEXP.exec(str);
    if (result) {
      matches.add(result.groups.pageName);
    }
  } while (result);

  return matches;
}

function replacePageReferences(str) {
  return str.replace(LINK_REGEXP, function (matched, pageName) {
    return `<a href="/keyword/${pageName}">${pageName}</a>`;
  });
}
