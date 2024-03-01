import * as React from "react";
import { createRoot } from "react-dom/client";

// 下次渲染之前 先执行所有的useEffect 返回的销毁函数
// 提交之后再执行

const element = <h1>hello</h1>;
const root = createRoot(document.getElementById("root"));
root.render(element);
