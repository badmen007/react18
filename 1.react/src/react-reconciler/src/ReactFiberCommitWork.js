import { MutationMask, Placement } from "./ReactFiberFlags";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import {
  appendChild,
  insertBefore,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";

function recursivelyTraverseMutationEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber;
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}

function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  if (flags & Placement) {
    commitPlacement(finishedWork);
    finishedWork.flags & ~Placement;
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
}

/**
 * 子节点对应的真实DOM插入到父亲中
 * @param {*} node
 * @param {*} parent
 */
function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const { stateNode } = node;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else {
    const { child } = node;
    if (child !== null) {
      insertOrAppendPlacementNode(child, parent);
      let { sibling } = child;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

/**
 * 找到插入的锚点
 * @param {*} fiber 
 */
function getHostSibling(fiber) {
  let node = fiber
  siblings: while(true) {
    while(node.sibling == null) {
      if (node.return == null || isHostParent(node.return)){ 
        return null
      }
      node = node.return
    }
    node = node.sibling
    while(node.tag !== HostComponent && node.tag !== HostText) {
      if (node.flags & Placement) {
        continue siblings
      } else {
        node = node.child
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode
    }
  }
}

/**
 * fiber的真实DOM插入到父DOM中
 * @param {*} finishedWork
 */
function commitPlacement(finishedWork) {
  const parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostComponent: {
      const parent = parentFiber.stateNode;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before,parent);
    }
    default:
      break;
  }
}

/**
 * 遍历fiber树 执行副作用
 * @param {*} finishedWork
 * @param {*} root
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  switch (finishedWork.tag) {
    case HostRoot:
    case HostComponent:
    case HostText:
      // 遍历子节点 处理他们节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      break;
    default:
      break;
  }
}
