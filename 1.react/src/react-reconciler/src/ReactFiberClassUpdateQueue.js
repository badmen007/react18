import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import assign from "shared/assign";

export const UpdateState = 0;

export function initializeUpdateQueue(fiber) {
  const queue = {
    shared: {
      pending: null,
      interleaved: null, // 这玩意是干啥的？
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate() {
  const update = {
    tag: UpdateState,
    payload: null,
    next: null,
  };
  return update;
}

export function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue == null) {
    return null;
  }
  const shareQueue = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, shareQueue, update);
}

function getStateFromUpdate(update, prevState) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update;
      return assign({}, prevState, payload);
  }
}

export function processUpdateQueue(workInProgress) {
  const queue = workInProgress.updateQueue;
  const pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    let newState = workInProgress.memoizedState;
    let update = firstPendingUpdate;
    while (update) {
      newState = getStateFromUpdate(update, newState);
      update = update.next;
    }
    workInProgress.memoizedState = newState;
  }
}
