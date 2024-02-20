import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
export function createContainer(containerInfo, tag) {
  return createFiberRoot(containerInfo, tag);
}

/**
 * 
 * @param {*} element 虚拟DOM
 * @param {*} container 根fiber
 */
export function updateContainer(element, container) {
  // current 就是HostRootFiber
  const current = container.current
  const update = createUpdate()
  update.payload = {
    element
  }
  const root = enqueueUpdate(current, update)
  if (root !== null){ 
    scheduleUpdateOnFiber(root)
  }
}