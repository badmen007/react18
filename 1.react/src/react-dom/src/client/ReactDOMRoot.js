import { createContainer } from "../../../react-reconciler/src/ReactFiberReconciler";
import { ConcurrentRoot } from "../../../react-reconciler/src/ReactRootTags";

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
export function createRoot(container, options) {
  const root = createContainer(container, ConcurrentRoot);
  return new ReactDOMRoot(root);
}
