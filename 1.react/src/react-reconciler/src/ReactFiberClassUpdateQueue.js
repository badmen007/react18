import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import assign from "shared/assign";
import { NoLanes, isSubsetOfLanes, mergeLanes } from "./ReactFiberLane";


export const UpdateState = 0;

export function initializeUpdateQueue(fiber) {
  const queue = {
    shared: {
      baseState: fiber.memoizedState, // 本次更新前的fiber状态，更新会基于它进行计算状态
      firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链的头部
      lastBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链的尾部
      pending: null,
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate(lane) {
  const update = {
    tag: UpdateState,
    payload: null,
    next: null,
    lane,
  };
  return update;
}

export function enqueueUpdate(fiber, update, lane) {
  const updateQueue = fiber.updateQueue;
  const shareQueue = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, shareQueue, update, lane);
}

function getStateFromUpdate(update, prevState, nextProps) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update;
      let partialState;
      if (typeof payload === "function") {
        partialState = payload.call(null, prevState, nextProps);
      } else {
        partialState = payload;
      }
      return assign({}, prevState, partialState);
  }
}

export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  const queue = workInProgress.updateQueue;

  let firstBaseUpdate = queue.firstBaseUpdate;
  let lastBaseUpdate = queue.lastBaseUpdate;

  const pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    // 剪断新的链表
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;

    if (lastBaseUpdate == null) {
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;
  }
  if (firstBaseUpdate !== null) {
    // 上次的更新前的老状态
    let newState = queue.baseState;
    let newLanes = NoLanes;
    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;
    let update = firstBaseUpdate; // 单链表
    do {
      // 获取此更新赛道
      const updateLane = update.lane;
      // 如果说updateLane不是renderLanes的子集的话 说明本次渲染不需要更新
      // 需要跳过
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload,
        };
        // 说明新的跳过的base链表为空 说明当前这个更新是第一个跳过的更新
        if (newLastBaseUpdate == null) {
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          // 计算保存新的baseState 这个时候说明有跳过的了
          // 需要记录一下 newBaseState 作为下一次开始的初始值
          newBaseState = newState;
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLanes,
            payload: update.payload,
          };
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newState = getStateFromUpdate(update, newState, nextProps);
      }
      update = update.next;
    } while (update);
    if (!newLastBaseUpdate) {
      newBaseState = newState;
    }
    queue.baseState = newBaseState;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;
    workInProgress.lanes = newLanes;
    workInProgress.memoizedState = newState;
  }
}
// 为什么要克隆呢？
export function cloneUpdateQueue(current, workInProgress) {
  const workInProgressQueue = workInProgress.updateQueue
  const currentQueue = current.updateQueue
  if (workInProgressQueue == currentQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared
    }
    workInProgress.updateQueue = clone
  }
}
