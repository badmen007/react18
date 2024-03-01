import {
  scheduleCallback as Scheduler_scheduleCallback,
  shouldYield,
  NormalPriority as NormalSchedulerPriority,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  cancelCallback as Scheduler_cancelCallback,
  now,
} from "./Scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { MutationMask, NoFlags, Passive } from "./ReactFiberFlags";
import {
  commitMutationEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
  commitLayoutEffect,
} from "./ReactFiberCommitWork";
import { finishQueueConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import {
  NoLane,
  NoLanes,
  markRootUpdated,
  getNextLanes,
  getHighestPriorityLane,
  SyncLane,
  includesBlockingLane,
  markStarvedLanesAsExpired,
  NoTimestamp,
  includesExpiredLane,
  markRootFinished,
  mergeLanes,
} from "./ReactFiberLane";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  lanesToEventPriority,
  IdleEventPriority,
  setCurrentUpdatePriority,
} from "./ReactEventPriorities";
import { getCurrentEventPriority } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  scheduleSyncCallback,
  flushSyncCallbacks,
} from "./ReactFiberSyncTaskQueue";

// 构建fiber树正在进行中
const RootInProgress = 0;
// 构建fiber树已经完成
const RootCompleted = 5;

let workInProgressRoot = null;
let workInProgressRootExitStatus = RootInProgress;

let workInProgress = null;
let rootDoesHavePassiveEffect = false; // 有没有副作用
let rootWithPendingPassiveEffects = null; // 具有useEffect副作用的根节点 FiberRootNode
let workInProgressRootRenderLanes = NoLanes;
let currentEventTime = NoTimestamp;

function ensureRootIsScheduled(root, currentTime) {
  // 获取当前根上执行的任务
  const existingCallbackNode = root.callbackNode;
  // 把饿死的赛道标记过期
  markStarvedLanesAsExpired(root, currentTime);

  const nextLanes = getNextLanes(root, workInProgressRootRenderLanes);
  if (nextLanes == NoLanes) {
    return;
  }
  let newCallbackPriority = getHighestPriorityLane(nextLanes);
  const existingCallbackPriority = root.callbackPriority;
  // 批量更新
  if (existingCallbackPriority == newCallbackPriority) {
    return;
  }
  if (existingCallbackNode !== null) {
    console.log("cancelCallback");
    Scheduler_cancelCallback(existingCallbackNode);
  }
  let newCallbackNode;
  if (newCallbackPriority === SyncLane) {
    // 如果是个同步的赛道的话，添加到同步的队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    // 把flushSyncCallbacks放入到微任务中
    queueMicrotask(flushSyncCallbacks);
    newCallbackNode = null;
  } else {
    // 如果不是同步
    let schedulerPriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
      default:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
    }
    newCallbackNode = Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }
  root.callbackNode = newCallbackNode;
  root.callbackPriority = newCallbackPriority;
}

function performSyncWorkOnRoot(root) {
  // 获取最高优先级的lane,
  const lanes = getNextLanes(root);
  // 渲染新的fiber树
  renderRootSync(root, lanes);
  // 新渲染完成的fiber根节点
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  return null;
}

export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  markRootUpdated(root, lane);
  ensureRootIsScheduled(root, eventTime);
}

// 创建新的workInProgress
function prepareFreshStack(root, renderLanes) {
  workInProgress = createWorkInProgress(root.current, null);
  workInProgressRootRenderLanes = renderLanes;
  workInProgressRoot = root;
  finishQueueConcurrentUpdates();
}

// 并发的
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    sleep(5);
    performUnitOfWork(workInProgress);
  }
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // 新fiber对应的老fiber
  const current = unitOfWork.alternate;
  let next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    completeWork(current, completedWork);
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    // 没有兄弟了 就是最后一个
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
  // fiber树构建完成了
  if (workInProgressRootExitStatus == RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

function renderRootSync(root, renderLanes) {
  // 新的根和老的根不一样， 或者是新的优先级和老的渲染优先级不一样
  if (
    root !== workInProgressRoot ||
    workInProgressRootRenderLanes !== renderLanes
  ) {
    prepareFreshStack(root, renderLanes);
  }
  workLoopSync();
  return RootCompleted;
}

function performConcurrentWorkOnRoot(root, didTimeout) {
  // 先获取当前根节点上的任务
  const originalCallbackNode = root.callbackNode;
  // 没有要渲染的任务
  const lanes = getNextLanes(root, NoLane);
  if (lanes == NoLanes) {
    return null;
  }
  // 不包含阻塞的车道
  const nonIncludesBlockingLane = !includesBlockingLane(root, lanes);
  // 不包含过期的车道
  const nonIncludesExpiredLane = !includesExpiredLane(root, lanes);
  // 事件片没有过期
  const nonTimeout = !didTimeout;
  const shouldTimeSlice =
    nonIncludesBlockingLane && nonIncludesExpiredLane && nonTimeout;

  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);
  //  当前不在执行中
  if (exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    commitRoot(root);
  }
  // 说明当前的任务没有完成
  if (root.callbackNode === originalCallbackNode) {
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  return null;
}

function renderRootConcurrent(root, lanes) {
  // 只有第一次进来才会创建新的fiber
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }
  workLoopConcurrent();
  // fiber树的构建还没有完成
  if (workInProgress !== null) {
    return RootInProgress;
  }
  return workInProgressRootExitStatus;
}

function flushPassiveEffect() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    // 执行卸载副作用
    commitPassiveUnmountEffects(root.current);
    // 执行挂载副作用
    commitPassiveMountEffects(root, root.current);
  }
}

function commitRoot(root) {
  let previousUpdatePriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(DiscreteEventPriority);
    commitRootImpl(root);
  } finally {
    setCurrentUpdatePriority(previousUpdatePriority);
  }
}

function commitRootImpl(root) {
  const { finishedWork } = root;
  console.log("commit", finishedWork.child.memoizedState.memoizedState[0]);
  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  root.callbackNode = null;
  root.callbackPriority = NoLane;

  const remainingLanes = mergeLanes(
    finishedWork.lanes,
    finishedWork.childLanes,
  );
  markRootFinished(root, remainingLanes);
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;
      // 这是个宏任务
      Scheduler_scheduleCallback(NormalSchedulerPriority, flushPassiveEffect);
    }
  }
  //printFinishedWork(finishedWork);
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  // 表示有插入或者更新
  if (subtreeHasEffects || rootHasEffect) {
    // dom变更之后 ui渲染之前
    commitMutationEffectsOnFiber(finishedWork, root);
    commitLayoutEffect(finishedWork, root);
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }
  root.current = finishedWork;
  // 前面有取消的任务 根上可能有跳过的更新 需要重新再次调度
  ensureRootIsScheduled(root, now());
}

export function requestUpdateLane() {
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLanes) {
    return updateLane;
  }
  const eventLane = getCurrentEventPriority();
  return eventLane;
}

function sleep(duration) {
  const timeStamp = new Date().getTime();
  const endTime = timeStamp + duration;
  while (true) {
    if (new Date().getTime() > endTime) {
      return;
    }
  }
}

// 返回当前的时间
export function requestEventTime() {
  currentEventTime = now();
  return currentEventTime;
}
