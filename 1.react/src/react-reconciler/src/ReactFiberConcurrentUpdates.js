import { HostRoot } from "./ReactWorkTags";

let concurrentQueues = [];
let concurrentQueuesIndex = 0;

export function finishQueueConcurrentUpdates() {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;
  let i = 0
  while (i < endIndex) {
    const fiber = concurrentQueues[i++]
    const queue = concurrentQueues[i++]
    const update = concurrentQueues[i++]
    if (queue !== null && update !== null) {
      const pending = queue.pending
      if (pending == null) {
        update.next = update
      }else {
        update.next = pending.next
        pending.next = update
      }
      queue.pending = update
    }
  }
}

function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let node = sourceFiber;
  let parent = sourceFiber.return;
  while (parent !== null) {
    node = parent;
    parent = parent.return;
  }
  if (node.tag == HostRoot) {
    return node.stateNode;
  }
  return null;
}

export function enqueueConcurrentClassUpdate(fiber, queue, update) {
  const pending = queue.pending;
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

export function enqueueConcurrentHookUpdate(fiber, queue, update) {
  enqueueUpdate(fiber, queue, update);
  return getRootForUpdatedFiber(fiber);
}

function getRootForUpdatedFiber(sourceFiber) {
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? node.stateNode : null;
}

function enqueueUpdate(fiber, queue, update) {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
}
