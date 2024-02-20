import { createContainer, updateContainer } from "../../../react-reconciler/src/ReactFiberReconciler";
import { ConcurrentRoot } from "../../../react-reconciler/src/ReactRootTags";

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot
  updateContainer(children, root)
}
export function createRoot(container, options) {
  const root = createContainer(container, ConcurrentRoot);
  return new ReactDOMRoot(root);
}
