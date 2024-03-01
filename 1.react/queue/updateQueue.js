const NoLanes = 0;
const NuLane = 0;
const SyncLane = 0b01; // 1
const InputContinuousHydrationLane = 0b10; // 2

function isSubsetOfLanes(set, subset) {
  return (set & subset) == subset
}

function mergeLanes(a, b) {
  return a | b
}

function getStateFromUpdate(update, prevState) {
  return update.payload(prevState)
}

function initializeUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState, // 本次更新前的fiber状态，更新会基于它进行计算状态
    firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链的头部
    lastBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链的尾部
    shared: {
      pending: null,
    },
  };
  fiber.updateQueue = queue;
}

function enqueueUpdate(fiber, update) {
  let updateQueue = fiber.updateQueue;
  const sharedQueue = updateQueue.shared;
  const pending = sharedQueue.pending;
  if (pending == null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  sharedQueue.pending = update;
}
// 相当于执行了两次
function processUpdateQueue(fiber, renderLanes) {
  const queue = fiber.updateQueue;

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
      const updateLane = update.lane
      // 如果说updateLane不是renderLanes的子集的话 说明本次渲染不需要更新
      // 需要跳过
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload
        }
        // 说明新的跳过的base链表为空 说明当前这个更新是第一个跳过的更新
        if (newLastBaseUpdate == null) {
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          // 计算保存新的baseState 这个时候说明有跳过的了
          // 需要记录一下 newBaseState 作为下一次开始的初始值
          newBaseState = newState;
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newLanes = mergeLanes(newLanes, updateLane)
      } else {
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLanes,
            payload: update.payload
          }
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newState = getStateFromUpdate(update, newState)
      }
      update = update.next
    } while(update)
    if (!newLastBaseUpdate) {
      newBaseState = newState
    }
    queue.baseState = newBaseState
    queue.firstBaseUpdate = newFirstBaseUpdate
    queue.lastBaseUpdate = newLastBaseUpdate
    fiber.lanes = newLanes
    fiber.memoizedState = newState
  }
}

// 在执行渲染的时候总会找优先级最高的执行 跳过优先级低的更新
let fiber = { memoizedState: "" };
initializeUpdateQueue(fiber);

let updateA = {
  id: "A",
  payload: (state) => state + "A",
  lane: SyncLane,
};
enqueueUpdate(fiber, updateA);
let updateB = {
  id: "B",
  payload: (state) => state + "B",
  lane: InputContinuousHydrationLane,
};
enqueueUpdate(fiber, updateB);
let updateC = {
  id: "C",
  payload: (state) => state + "C",
  lane: SyncLane,
};
enqueueUpdate(fiber, updateC);
let updateD = {
  id: "D",
  payload: (state) => state + "D",
  lane: SyncLane,
};
enqueueUpdate(fiber, updateD);

processUpdateQueue(fiber, SyncLane);
console.log(fiber.memoizedState);
console.log('updateQueue', printUpdateQueue(fiber.updateQueue))

// let updateE = {
//   id: "E",
//   payload: (state) => state + "E",
//   lane: InputContinuousHydrationLane,
// };
// enqueueUpdate(fiber, updateC);
// let updateF = {
//   id: "F",
//   payload: (state) => state + "F",
//   lane: SyncLane,
// };
// enqueueUpdate(fiber, updateF);

// processUpdateQueue(fiber, InputContinuousHydrationLane);
// console.log(fiber.memoizedState);

// 第一次执行跳过的链表 会和第二次更新的链表合并在一起 相当于高优先级的任务走了两次

function printUpdateQueue(updateQueue) {
  const { baseState, firstBaseUpdate } = updateQueue
  let desc = baseState + '#'
  let update = firstBaseUpdate
  while(update) {
    desc += (update.id + '=>')
    update = update.next
  }
  desc += 'null'
  console.log(desc)
}