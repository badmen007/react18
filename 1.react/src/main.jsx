import * as React from "react";
import { createRoot } from "react-dom/client";

function FunctionComponent() {
  const [number, setNumber] = React.useState(0);
  const buttonRef = React.useRef();
  React.useEffect(() => {
    console.log(buttonRef.current);
  }, []);
  return (
    <button
      ref={buttonRef}
      onClick={() => {
        setNumber((number) => number + 1);
      }}
    >
      {number}
    </button>
  );
}
// function FunctionComponent() {
//   const [numbers, setNumbers] = React.useState(new Array(20).fill("A"));
//   // const divRef = React.useRef();
//   React.useEffect(() => {
//     setTimeout(() => {
//       // divRef.current.click();
//     }, 10);
//     setNumbers((numbers) => numbers.map((item) => item + "B"));
//   }, []);
//   return (
//     <button
//       // ref={divRef}
//       onClick={() => {
//         setNumbers((numbers) => numbers.map((item) => item + "C"));
//       }}
//     >
//       {numbers.map((number, index) => (
//         <span key={index}>{number}</span>
//       ))}
//     </button>
//   );
// }
let element = <FunctionComponent />;
const root = createRoot(document.getElementById("root"));
root.render(element);
