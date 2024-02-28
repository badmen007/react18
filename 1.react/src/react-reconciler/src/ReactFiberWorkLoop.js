import { scheduleCallback } from "scheduler";
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

const RootInProgress = 0;

let workInProgressRoot = null;
let workInProgressRootExitStatus = RootInProgress;

let workInProgress = null;
let rootDoesHavePassiveEffect = false; // 有没有副作用
let rootWithPendingPassiveEffects = null; // 具有useEffect副作用的根节点 FiberRootNode

function ensureRootIsScheduled(root) {
  if (workInProgressRoot) return;
  workInProgressRoot = root;
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root));
}

export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null);
  finishQueueConcurrentUpdates();
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // 新fiber对应的老fiber
  const current = unitOfWork.alternate;
  let next = beginWork(current, unitOfWork);
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
}

function renderRootSync(root) {
  prepareFreshStack(root);
  workLoopSync();
}

function performConcurrentWorkOnRoot(root) {
  renderRootSync(root);
  // 开始进入提交阶段
  // 最新构建出来的fiber树
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  workInProgressRoot = null;
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
  const { finishedWork } = root;
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;
      // 这是个宏任务
      scheduleCallback(flushPassiveEffect);
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

function printFinishedWork(fiber) {
  let { flags, deletions } = fiber;
  if ((flags & ChildDeletion) !== NoFlags) {
    flags &= ~ChildDeletion;
    console.log(
      "子节点删除" +
        deletions
          .map((fiber) => `${fiber.type}#${fiber.memoizedProps.id}`)
          .join(","),
    );
  }
  let child = fiber.child;
  while (child) {
    printFinishedWork(child);
    child = child.sibling;
  }
  if (fiber.flags !== NoFlags) {
    console.log(
      getFlags(fiber),
      getTag(fiber.tag),
      typeof fiber.type === "function" ? fiber.type.name : fiber.type,
      fiber.memoizedProps,
    );
  }
}

function getFlags(fiber) {
  const { flags, deletions } = fiber;
  if (flags === (Placement | Update)) {
    return "移动";
  }
  if (flags === Placement) {
    return "插入";
  }
  if (flags === Update) {
    return "更新";
  }
  return flags;
}

function getTag(tag) {
  switch (tag) {
    case FunctionComponent:
      return "FunctionComponent";
    case HostRoot:
      return "HostRoot";
    case HostComponent:
      return "HostComponent";
    case HostText:
      return "HostText";
    default:
      return tag;
  }
}
