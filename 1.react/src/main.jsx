import * as React from "react";
import { createRoot } from "react-dom/client";

function reducer(state, action) {
  if (action.type === "add") return state + action.payload;
  return state;
}

function FunctionComponent() {
  debugger
  const [number, setNumber] = React.useReducer(reducer, 0);
  console.log(number, "~~~");
  return (
    <button
      id={Date.now()}
      onClick={() => {
        setNumber({ type: "add", payload: 1 });
        setNumber({ type: "add", payload: 2 });
        setNumber({ type: "add", payload: 3 });
      }}
    >
      {number}
    </button>
  );
}

const element = <FunctionComponent />;
const root = createRoot(document.getElementById("root"));
root.render(element);
