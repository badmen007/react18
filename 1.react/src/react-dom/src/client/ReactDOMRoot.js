import {
  createContainer,
  updateContainer,
} from "react-reconciler/src/ReactFiberReconciler";
import { ConcurrentRoot } from "react-reconciler/src/ReactRootTags";
import { listenToAllSupportedEvents } from "react-dom-bindings/src/events/DOMPluginEventSystem";

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;
  root.containerInfo.innerHTML = ''
  updateContainer(children, root);
};
export function createRoot(container, options) {
  const root = createContainer(container, ConcurrentRoot);
  listenToAllSupportedEvents(container);
  return new ReactDOMRoot(root);
}
