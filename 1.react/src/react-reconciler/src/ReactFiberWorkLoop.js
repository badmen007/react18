import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from './ReactFiberCompleteWork'
import { MutationMask, NoFlags } from "./ReactFiberFlags";
import { commitMutationEffectsOnFiber } from './ReactFiberCommitWork'

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
  // 开始进入提交阶段
  // 最新构建出来的fiber树
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  commitRoot(root)
}

function commitRoot(root) {
  const { finishedWork } = root
  const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  // 表示有插入或者更新
  if (subtreeHasEffects || rootHasEffect) {
    commitMutationEffectsOnFiber(finishedWork, root)
  }
  root.current = finishedWork
}