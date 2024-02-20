import { createRoot } from "react-dom/client";
const element = (
  <h1>
    hello <span style={{ color: "red" }}>world</span>
  </h1>
);
const root = createRoot(document.getElementById("root"));
debugger
root.render(element);
