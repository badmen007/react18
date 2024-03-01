import { NoFlags } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane";
import {
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "./ReactWorkTags";

function FiberNode(tag, pendingProps, key) {
  this.tag = tag;
  this.key = key;
  this.stateNode = null;

  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.memoizedState = null;
  this.updateQueue = null;
  this.dependencies = null;

  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;

  this.alternate = null;

  // 存放将要删除的节点
  this.deletions = null;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;
  this.ref = null;
}

function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}

export function createHostRootFiber(tag) {
  return createFiber(HostRoot, null, null);
}

export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
  }
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.flags = current.flags;
  workInProgress.lanes = current.lanes;
  workInProgress.childLanes = current.childLanes;
  
  return workInProgress;
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  // 相当于默认值
  let fiberTag = IndeterminateComponent;
  if (type == "function") {
  } else if (typeof type === "string") {
    fiberTag = HostComponent;
  }
  const fiber = createFiber(fiberTag, pendingProps, key);
  fiber.type = type;
  return fiber;
}

/**
 * 根据虚拟DOM创建fiber
 * @param {*} element 虚拟DOM元素
 */
export function createFiberFromElement(element) {
  const { type, key, props: pendingProps } = element;
  const fiber = createFiberFromTypeAndProps(type, key, pendingProps);
  return fiber;
}

export function createFiberFromText(content) {
  const fiber = createFiber(HostText, content, null);
  return fiber;
}
