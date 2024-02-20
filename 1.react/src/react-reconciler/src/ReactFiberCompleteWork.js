import logger, { indent } from "scheduler/logger";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import {
  createTextInstance,
  createInstance,
  appendInitialChild,
  finalizeInitialChildren,
} from "../../react-dom-bindings/src/client/ReactDOMHostConfig";
import { NoFlags } from "./ReactFiberFlags";

function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child
  while(node) {
    if (node.tag == HostComponent || node.tag == HostText) {
      appendInitialChild(parent, node.stateNode)
    } else if (node.child !== null) {
      node = node.child
      continue
    }
    if (node == workInProgress) {
      return
    }
    while (node.sibling == null) {
      if (node.return == null || node.return == workInProgress) {
        return
      }
      node = node.return
    }
    node = node.sibling
  }
  
}
/**
 *
 * @param {*} current 老的fiber
 * @param {*} workInProgress 新的fiber
 */
export function completeWork(current, workInProgress) {
  indent.number -= 2;
  logger(" ".repeat(indent.number) + "completeWork", workInProgress);
  const newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case HostRoot:
      bubbleProperties(workInProgress)
      break
    case HostComponent:
      // 创建真实的DOM节点
      const { type } = workInProgress;
      const instance = createInstance(type, newProps, workInProgress);
      // 把所有的儿子都挂在自己的身上 -> 初次挂载
      appendAllChildren(instance, workInProgress);
      workInProgress.stateNode = instance;
      finalizeInitialChildren(instance, type, newProps);
      // 向上冒泡
      bubbleProperties(workInProgress);
      break;
    case HostText:
      // 创建真实的文本节点
      const newText = newProps;
      // 创建真实的DOM节点
      workInProgress.stateNode = createTextInstance(newText);
      // 向上冒泡
      bubbleProperties(workInProgress);
      break;
  }
}

function bubbleProperties(completedWork) {
  // 合并副作用
  let subtreeFlags = NoFlags;
  let child = completedWork.child
  while(child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags
    child = child.sibling
  }
  completedWork.subtreeFlags = subtreeFlags
}
