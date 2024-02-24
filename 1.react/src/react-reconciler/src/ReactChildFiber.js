import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { createFiberFromElement, createFiberFromText, createWorkInProgress } from "./ReactFiber";
import { Placement } from "./ReactFiberFlags";
import isArray from 'shared/isArray'

function createChildReconciler(shouldTrackSideEffects) {

  /**
   * 基于老的fiber创建新的fiber
   * @param {*} fiber 
   * @param {*} pendingProps 
   * @returns 
   */
  function useFiber(fiber, pendingProps) {
    const clone = createWorkInProgress(fiber, pendingProps)
    clone.index = 0
    clone.sibling = null
    return clone
  }

  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    const key = element.key
    let child = currentFirstChild
    while(child !== null) {
      if (child.key == key) {
        if (child.type == element.type) {
          const existing = useFiber(child, element.props)
          existing.return = returnFiber
          return existing
        }
      }
      child = child.sibling
    }
    // 没有老的节点
    const created = createFiberFromElement(element);
    created.return = returnFiber;
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
          return created;
        default:
          break;
      }
    }
    return null;
  }
  function placeChild(newFiber, newIdx) {
    newFiber.index = newIdx;
    if (shouldTrackSideEffects) {
      // 如果一个fiber它的flags上有Placement 说明这个节i单需要创建真实DOM并且插入到父节点中
      newFiber.flags |= Placement;
    }
  }
  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    let resultingFirstChild = null;
    let previousNewFiber = null;
    let newIndex = 0;
    for (; newIndex < newChildren.length; newIndex++) {
      const newFiber = createChild(returnFiber, newChildren[newIndex]);
      if (newFiber == null) continue;
      placeChild(newFiber, newIndex);
      if (previousNewFiber == null) {
        resultingFirstChild = newFiber;
      } else {
        // 否则说明不是大儿子
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
    return resultingFirstChild;
  }
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return PlaceSingleChild(
            reconcileSingleElement(returnFiber, currentFirstChild, newChild)
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
