import ReactSharedInternals from "shared/ReactSharedInternals";
import {
  requestEventTime,
  requestUpdateLane,
  scheduleUpdateOnFiber,
} from "./ReactFiberWorkLoop";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from "./ReactHookEffectTags";
import { NoLane, NoLanes, isSubsetOfLanes } from "./ReactFiberLane";

const { ReactCurrentDispatcher } = ReactSharedInternals;
let workInProgressHook = null;
let currentlyRenderingFiber = null;
let currentHook = null;
let renderLanes = NoLanes;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
  useRef: mountRef,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useRef: updateRef,
};

function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = {
    current: initialValue,
  };
  hook.memoizedState = ref;
  return ref;
}

function updateRef() {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy;
  if (currentHook !== null) {
    // 老的effect
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 用新数组和老数组进行对比 一样就不执行create
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps,
  );
}
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps == null) {
    return null;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps,
  );
}
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  };
  // 构建循环链表
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue == null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    // 只有一个的时候 自己指向自己
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    // 这个下面是不是可以不要啊
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect == null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null,
  };
}
function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}

function updateState(initialState) {
  return updateReducer(baseStateReducer, initialState);
}

/**
 *
 * memoizedState:真正显示出来的状态
 * baseState: 第一个跳过的更新之前的状态
 * lastRenderedState: 上一个计算的状态
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    // 上一个
    lastRenderedReducer: baseStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ));
  return [hook.memoizedState, dispatch];
}

function dispatchSetState(fiber, queue, action) {
  // 请求更新赛道
  const lane = requestUpdateLane();
  const update = {
    lane,
    action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };
  // 派发送动作之后 ，立即用上一次的状态和上一次的reducer计算新状态
  const alternate = fiber.alternate;
  // 只有第一次更新才能做这个优化
  if (
    fiber.lanes == NoLanes &&
    (alternate == null || alternate.lanes == NoLanes)
  ) {
    const { lastRenderedReducer, lastRenderedState } = queue;
    const eagerState = lastRenderedReducer(lastRenderedState, action);
    update.hasEagerState = true;
    update.eagerState = eagerState;
    if (Object.is(eagerState, lastRenderedState)) return;
  }
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  const eventTime = requestEventTime();
  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}
/**
 * 构建新的hook
 */
function updateWorkInProgressHook() {
  if (currentHook == null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
  };
  if (workInProgressHook == null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}

function updateReducer(reducer) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  queue.lastRenderedReducer = reducer;
  const current = currentHook;
  let baseQueue = current.baseQueue;
  const pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  if (baseQueue !== null) {
    printQueue(baseQueue);
    const first = baseQueue.next;
    let newState = current.baseState;
    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;
    do {
      const updateLane = update.lane;
      const shouldSkipUpdate = !isSubsetOfLanes(renderLanes, updateLane);
      if (shouldSkipUpdate) {
        const clone = {
          lane: updateLane,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane,
        );
      } else {
        if (newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null,
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        if (update.hasEagerState) {
          newState = update.eagerState;
        } else {
          const action = update.action;
          newState = reducer(newState, action);
        }
      }
      update = update.next;
    } while (update !== null && update !== first);
    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }
    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = newState;
  }
  if (baseQueue === null) {
    queue.lanes = NoLanes;
  }
  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}

function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ));
  return [hook.memoizedState, dispatch];
}

/**
 * 更新
 * @param {*} fiber
 * @param {*} queue
 * @param {*} action
 */
function dispatchReducerAction(fiber, queue, action) {
  const update = {
    action,
    next: null,
  };
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  const eventTime = requestEventTime();
  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}

function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    queue: null, // 存放本hook的更新队列
    next: null, // 指向下一个hook
    baseState: null, // 第一个跳过的更新之前的状态
    baseQueue: null, // 跳过的更新的链表
  };
  if (workInProgressHook == null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

/**
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component
 * @param {*} props
 */
export function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  nextRenderLanes,
) {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;
  // 每次清除updateQueue
  currentlyRenderingFiber.updateQueue = null;
  workInProgress.memoizedState = null;
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  const children = Component(props);
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLanes = NoLanes;
  return children;
}

function printQueue(queue) {
  const first = queue.next;
  let desc = "";
  let update = first;
  do {
    desc += "=>" + update.action.id;
    update = update.next;
  } while (update !== null && update !== first);
  desc += "=>null";
  console.log(desc);
}
