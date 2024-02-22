import * as React from 'react'
import { createRoot } from "react-dom/client";

function reducer(state, action) {
  if (action.type === 'add') return state + 1
  return state
}

function FunctionComponent() {
  const [number, setNumber ] = React.useReducer(reducer, 0)
  return <button onClick={() => setNumber({type: 'add'})}>{number}按钮</button>;
}

const element = <FunctionComponent />
const root = createRoot(document.getElementById("root"));
root.render(element);
