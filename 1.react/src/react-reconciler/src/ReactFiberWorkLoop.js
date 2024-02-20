import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from './ReactFiberCompleteWork'

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
  console.log(workInProgress);
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
  let completedWork = unitOfWork
  do{
    const current = completedWork.alternate
    const returnFiber = completedWork.return
    completeWork(current, completedWork)
    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      workInProgress = siblingFiber
      return
    }
    // 没有兄弟了 就是最后一个
    completedWork = returnFiber
    workInProgress = completedWork
  }while(completedWork !== null)
}

function renderRootSync(root) {
  if (workInProgressRoot !== root) {
    prepareFreshStack(root)
  }
  workLoopSync()
}

function performConcurrentWorkOnRoot(root) {
  renderRootSync(root);
}