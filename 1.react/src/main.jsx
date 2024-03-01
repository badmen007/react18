import * as React from "react";
import { createRoot } from "react-dom/client";

function FunctionComponent() {
  console.log("FunctionComponent");
  const [number, setNumber] = React.useState(0);
  React.useEffect(() => {
    debugger
    setNumber((number) => number + 1);
  }, []);
  return (
    <button onClick={() => setNumber((number) => number + 1)}>{number}</button>
  );
}
let element = <FunctionComponent />;
const root = createRoot(document.getElementById("root"));
root.render(element);
