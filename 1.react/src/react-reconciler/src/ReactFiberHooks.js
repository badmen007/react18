import ReactSharedInternals from "shared/ReactSharedInternals";

const { ReactCurrentDispatcher } = ReactSharedInternals;
let workInProgressHook = null
let currentRenderingFiber = null

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
};

function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg
  const queue = {
    pending: null
  }
  hook.queue = queue
  const dispatch = dispatchReducerAction.bind(null, currentRenderingFiber, queue)
  return [hook.memoizedState, dispatch]
}

/**
 * 更新
 * @param {*} fiber 
 * @param {*} queue 
 * @param {*} action 
 */
function dispatchReducerAction(fiber, queue, action) {
  
}

function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    queue: null, // 存放本hook的更新队列
    next: null, // 指向下一个hook
  };
  if (workInProgressHook == null) {
    currentRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}

/**
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component
 * @param {*} props
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  currentRenderingFiber = workInProgress
  ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  const children = Component(props);
  return children;
}
