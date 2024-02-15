import { createRoot as createRootImpl } from "./ReactDOMRoot";
export function createRoot(container, options) {
  return createRootImpl(container, options);
}
