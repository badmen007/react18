import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { ChildDeletion, Placement } from "./ReactFiberFlags";
import isArray from "shared/isArray";

function createChildReconciler(shouldTrackSideEffects) {
  /**
   * 基于老的fiber创建新的fiber
   * @param {*} fiber
   * @param {*} pendingProps
   * @returns
   */
  function useFiber(fiber, pendingProps) {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions == null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      returnFiber.deletions.push(childToDelete);
    }
  }
  // 删除节点2中情况 1. 删除自己和兄弟 2. 删除兄弟
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) return;
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
      if (child.key == key) {
        if (child.type == element.type) {
          // 因为是单个节点 所以删除的是兄弟节点
          // 就是说原来可能有多个，现在就一个
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props);
          existing.ref = element.ref;
          existing.return = returnFiber;
          return existing;
        } else {
          // key相同 但是类型不同 自己和兄弟都删除
          deleteRemainingChildren(returnFiber, child);
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }
    // 没有老的节点
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    created.ref = element.ref;
    return created;
  }
  function PlaceSingleChild(newFiber) {
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }

    return newFiber;
  }
  function createChild(returnFiber, newChild) {
    if (
      (typeof newChild == "string" && newChild !== "") ||
      typeof newChild == "number"
    ) {
      const created = createFiberFromText(`${newChild}`);
      created.return = returnFiber;
      return created;
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const created = createFiberFromElement(newChild);
          created.return = returnFiber;
          created.ref = newChild.ref;
          return created;
        default:
          break;
      }
    }
    return null;
  }
  function placeChild(newFiber, lastPlacedIndex, newIdx) {
    newFiber.index = newIdx;
    if (!shouldTrackSideEffects) return lastPlacedIndex;
    const current = newFiber.alternate;
    if (current !== null) {
      const oldIndex = current.index;
      // 老的fiber的索引比 lastPlacedIndex 小 说明老的fiber对应的真实DOM需要移动
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex;
      }
    } else {
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }
  function updateElement(returnFiber, current, element) {
    const elementType = element.type;
    if (current !== null) {
      // 判断类型是不是一样，一样的话说明类型和key都相同 复用
      if (current.type === elementType) {
        const existing = useFiber(current, element.props);
        existing.return = returnFiber;
        existing.ref = element.ref;
        return existing;
      }
    }
    // 创建新的
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    created.ref = element.ref;
    return created;
  }
  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (newChild !== null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild);
          }
        }
        default:
          return null;
      }
    }
    return null;
  }
  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map();
    let existingChild = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }
  function updateTextNode(returnFiber, current, textContent) {
    if (current == null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }
  function updateFromMap(existingChildren, returnFiber, newIndex, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild == "number"
    ) {
      const matchedFiber = existingChildren.get(newIndex) || null;
      return updateTextNode(returnFiber, matchedFiber, "" + newChild);
    }
    if (typeof newChild == "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key == null ? newIndex : newChild.key,
            ) || null;
          return updateElement(returnFiber, matchedFiber, newChild);
        }
      }
    }
  }
  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    let resultingFirstChild = null;
    let previousNewFiber = null;
    let newIndex = 0;
    // 第一个老fiber
    let oldFiber = currentFirstChild;
    let nextOldFiber = null;
    let lastPlacedIndex = 0;

    for (; oldFiber !== null && newIndex < newChildren.length; newIndex++) {
      // 先暂存下一个老的fiber
      nextOldFiber = oldFiber.sibling;
      // 试图更新或者是复用老的fiber
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIndex]);
      if (newFiber == null) break;
      if (shouldTrackSideEffects) {
        // 表示创建了新的fiber 没有复用老的fiber
        if (oldFiber && newFiber.alternate == null) {
          deleteChild(returnFiber, oldFiber);
        }
      }
      // 上一个放置好的索引
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex);
      if (previousNewFiber == null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    // 说明新的儿子遍历完成了而老的fiber还有
    if (newIndex === newChildren.length) {
      // 删除剩下的老fiber
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    // 老的fiber没了 新的还有 创建fiber然后插入
    if (oldFiber == null) {
      for (; newIndex < newChildren.length; newIndex++) {
        const newFiber = createChild(returnFiber, newChildren[newIndex]);
        if (newFiber == null) continue;
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex);
        if (previousNewFiber == null) {
          resultingFirstChild = newFiber;
        } else {
          // 否则说明不是大儿子
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 开始处理移动的情况
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
    // 开始遍历剩下的虚拟DOM
    for (; newIndex < newChildren.length; newIndex++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIndex,
        newChildren[newIndex],
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          if (newFiber.alternate !== null) {
            existingChildren.delete(
              newFiber.key == null ? newIndex : newFiber.key,
            );
          }
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex);
        if (previousNewFiber == null) {
          resultingFirstChild = newFiber;
        } else {
          // 否则说明不是大儿子
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }
    // 删除map中剩下的老Fiber
    if (shouldTrackSideEffects) {
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }
    return resultingFirstChild;
  }
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return PlaceSingleChild(
            reconcileSingleElement(returnFiber, currentFirstChild, newChild),
          );
        default:
          break;
      }
    }
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
    }
    return null;
  }
  return reconcileChildFibers;
}

export const reconcileChildFibers = createChildReconciler(true);
export const mountChildFibers = createChildReconciler(false);
