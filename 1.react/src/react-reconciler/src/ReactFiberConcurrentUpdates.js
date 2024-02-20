import { HostRoot } from "./ReactWorkTags";

let concurrentQueues = null;


function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let node = sourceFiber
  let parent = sourceFiber.return
  while(parent !== null) {
    node = parent
    parent = parent.return
  }
  if (node.tag == HostRoot) {
    return node.stateNode
  }
  return null
}

export function enqueueConcurrentClassUpdate(fiber, queue, update) {
  const pending = queue.pending
  if (pending === null) {
    // 第一个更新
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
  return markUpdateLaneFromFiberToRoot(fiber);
}