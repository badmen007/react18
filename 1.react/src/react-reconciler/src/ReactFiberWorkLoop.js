import {
  scheduleCallback as Scheduler_scheduleCallback,
  shouldYield,
  NormalPriority as NormalSchedulerPriority,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
} from "./Scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Passive,
  Placement,
  Update,
} from "./ReactFiberFlags";
import {
  commitMutationEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
  commitLayoutEffect,
} from "./ReactFiberCommitWork";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import { finishQueueConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import {
  NoLane,
  NoLanes,
  markRootUpdated,
  getNextLanes,
  getHighestPriorityLane,
  SyncLane,
  includesBlockingLane,
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

function ensureRootIsScheduled(root) {
  const nextLanes = getNextLanes(root, NoLane);
  if (nextLanes == NoLanes) {
    return;
  }
  let newCallbackPriority = getHighestPriorityLane(nextLanes);
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
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }
  root.callbackNode = newCallbackNode;
}

function performSyncWorkOnRoot(root) {
  // 获取最高优先级的lane,
  const lanes = getNextLanes(root);
  // 渲染新的fiber树
  renderRootSync(root, lanes);
  // 新渲染完成的fiber根节点
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot();
  return null;
}

export function scheduleUpdateOnFiber(root, fiber, lane) {
  markRootUpdated(root, lane);
  ensureRootIsScheduled(root);
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
    sleep(6);
    performUnitOfWork(workInProgress);
    console.log("shouldYield", shouldYield(), workInProgress);
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
}

function performConcurrentWorkOnRoot(root, didTimeout) {
  console.log("performConcurrentWorkOnRoot");
  // 先获取当前根节点上的任务
  const originalCallbackNode = root.callbackNode;
  // 没有要渲染的任务
  const lanes = getNextLanes(root, NoLane);
  if (lanes == NoLanes) {
    return null;
  }
  // 如果不包含阻塞的赛道， 并且没有超时 就可以并行渲染 启用时间分片
  // 默认车道是同步的 不能启用时间分片
  const shouldTimeSlice = !includesBlockingLane(root, lanes) && !didTimeout;
  console.log("shouldTimeSlice", shouldTimeSlice);
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
  console.log("下一个宏任务");
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
  workInProgressRoot = null;
  workInProgressRootRenderLanes = null;
  root.callbackNode = null;
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
  console.log("开始commit~~~~~~~~~~~~~~~~~~~~~");
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  // 表示有插入或者更新
  if (subtreeHasEffects || rootHasEffect) {
    // dom变更之后 ui渲染之前
    console.log("DOM变更commitMutationEffectsOnFiber~~~~~~");
    commitMutationEffectsOnFiber(finishedWork, root);
    console.log("DOM变更后执行commitLayoutEffect~~~~~~");
    commitLayoutEffect(finishedWork, root);
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }
  root.current = finishedWork;
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
