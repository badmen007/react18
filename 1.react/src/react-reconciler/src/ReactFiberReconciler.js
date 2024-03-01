import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import {
  scheduleUpdateOnFiber,
  requestUpdateLane,
  requestEventTime,
} from "./ReactFiberWorkLoop";
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
  const current = container.current;
  const eventTime = requestEventTime()
  // 先请求一个更新车道
  const lane = requestUpdateLane(current);
  const update = createUpdate(lane);
  update.payload = {
    element,
  };
  const root = enqueueUpdate(current, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, current, lane, eventTime);
  }
}
