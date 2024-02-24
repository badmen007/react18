import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "./ReactWorkTags";
import { reconcileChildFibers, mountChildFibers } from "./ReactChildFiber";
import logger, { indent } from "scheduler/logger";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { renderWithHooks } from "./ReactFiberHooks";

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
    nextChildren = null;
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

function updateHostText(current, workInProgress) {
  return null;
}

/**
 * 函数组件
 * @param {*} current
 * @param {*} workInProgress
 * @param {*} Component
 */
export function mountIndeterminateComponent(
  current,
  workInProgress,
  Component
) {
  const props = workInProgress.pendingProps;
  const value = renderWithHooks(current, workInProgress, Component, props);
  workInProgress.tag = FunctionComponent;
  reconcileChildren(current, workInProgress, value);
  return workInProgress.child;
}

export function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps
) {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

export function beginWork(current, workInProgress) {
  // logger(" ".repeat(indent.number) + "beginWork", workInProgress);
  // indent.number += 2
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type
      );
    case FunctionComponent: {
      const Component = workInProgress.type;
      const nextProps = workInProgress.pendingProps;
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        nextProps
      );
    }
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
