import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import { reconcileChildFibers, mountChildFibers } from "./ReactChildFiber";
import logger, { indent } from "scheduler/logger";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "../../react-dom-bindings/src/client/ReactDOMHostConfig";

function pushHostRootContext(workInProgress) {
  const root = workInProgress.stateNode;
  pushHostContainer(workInProgress, root.containerInfo);
}

export function reconcileChildren(current, workInProgress, nextChildren) {
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // 更新
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    );
  }
}

function updateHostRoot(current, workInProgress) {
  // 需要知道子虚拟DOM
  processUpdateQueue(workInProgress);
  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element;
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}
function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  if (isDirectTextChild) {
    nextChildren = null
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

function updateHostText(current, workInProgress) {
  return null;
}

export function beginWork(current, workInProgress) {
  logger(" ".repeat(indent.number) + "beginWork", workInProgress);
  indent.number += 2
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case HostText:
      return updateHostText(current, workInProgress);
    default:
      return null;
  }
}
