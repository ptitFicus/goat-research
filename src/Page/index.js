import React, { useEffect, useState } from "react";
import Input from "../Input";

export default function Page({ name }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(name).then((content) => {
      if (content) {
        setContent(content);
      } else {
        setContent("*");
      }
      setLoading(false);
    });
  }, [name, setContent]);

  useEffect(() => setLoading(true), [name]);

  return (
    <>
      <h1>{name}</h1>
      {loading ? (
        <span>Loading...</span>
      ) : (
        <Input text={content} onChange={(content) => save(name, content)} />
      )}
    </>
  );
}

function save(page, content) {
  return new Promise((resolve) => resolve(localStorage.setItem(page, content)));
}

function load(page) {
  return new Promise((resolve) => resolve(localStorage.getItem(page)));
}
