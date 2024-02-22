import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { MutationMask, NoFlags, Placement, Update } from "./ReactFiberFlags";
import { commitMutationEffectsOnFiber } from "./ReactFiberCommitWork";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";

const RootInProgress = 0;

let workInProgressRoot = null;
let workInProgressRootExitStatus = RootInProgress;

let workInProgress = null;

function ensureRootIsScheduled(root) {
  const newCallbackNode = scheduleCallback(
    performConcurrentWorkOnRoot.bind(null, root)
  );
  root.callbackNode = newCallbackNode;
}

export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null);
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
  if (workInProgressRoot !== root) {
    prepareFreshStack(root);
  }
  workLoopSync();
}

function performConcurrentWorkOnRoot(root) {
  renderRootSync(root);
  // 开始进入提交阶段
  // 最新构建出来的fiber树
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
}

function commitRoot(root) {
  const { finishedWork } = root;
  printFinishedWork(finishedWork);
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  // 表示有插入或者更新
  if (subtreeHasEffects || rootHasEffect) {
    commitMutationEffectsOnFiber(finishedWork, root);
  }
  root.current = finishedWork;
}

function printFinishedWork(fiber) {
  let child = fiber.child;
  while (child) {
    printFinishedWork(child);
    child = child.sibling;
  }
  if (fiber.flags !== 0) {
    console.log(
      getFlags(fiber.flags),
      getTag(fiber.tag),
      fiber.type.name,
      fiber.memoizedProps
    );
  }
}

function getFlags(flags) {
  if (flags === Placement) {
    return '插入'
  }
  if (flags === Update) {
    return "更新";
  }
  return flags
}

function getTag(tag) {
  switch (tag) {
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
