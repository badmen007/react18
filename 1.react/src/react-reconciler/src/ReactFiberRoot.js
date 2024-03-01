import { createHostRootFiber } from "./ReactFiber";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { NoLane, NoLanes } from "./ReactFiberLane";

function FiberRootNode(containerInfo, tag) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  // 表示根上有哪些赛道
  this.pendingLanes = NoLanes
  this.callbackNode = null
  this.callbackPriority = NoLane
}

export function createFiberRoot(containerInfo, tag) {
  const root = new FiberRootNode(containerInfo, tag);

  const uninitializedFiber = createHostRootFiber(tag);

  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  initializeUpdateQueue(uninitializedFiber);

  return root;
}
