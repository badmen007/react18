import * as React from "react";
import { createRoot } from "react-dom/client";

function reducer(state, action) {
  if (action.type === "add") return state + 1;
  return state;
}

function FunctionComponent() {
  debugger;
  // 如果新状态和老状态一样的话 不重新渲染
  const [number, setNumber] = React.useState(0);
  return (
    <button
      onClick={() => {
        setNumber(number);
      }}
    >
      {number}
    </button>
  );
}

const element = <FunctionComponent />;
const root = createRoot(document.getElementById("root"));
root.render(element);
