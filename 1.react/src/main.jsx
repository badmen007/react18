import { createRoot } from "react-dom/client";

function FunctionComponent() {
  return (
    <h1
      onClick={() => console.log(`父冒泡`)}
      onClickCapture={() => console.log(`父捕获`)}
    >
      hello{" "}
      <span
        style={{ color: "red" }}
        onClick={() => console.log(`子冒泡`)}
        onClickCapture={() => console.log(`子捕获`)}
      >
        world
      </span>
    </h1>
  );
}

const element = <FunctionComponent />
const root = createRoot(document.getElementById("root"));
root.render(element);
