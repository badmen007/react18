import { peek, pop, push } from "../SchedulerMinHeap";
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from "../SchedulerPriorities";
import {
  userBlockingPriorityTimeout,
  lowPriorityTimeout,
  normalPriorityTimeout,
} from "../SchedulerFeatureFlags";

let taskIdCounter = 1;
// 任务最小堆
const taskQueue = [];
let scheduleHostCallback = null;
let startTime = null;
let currentTask = null;
// React 每一帧向浏览器申请5毫秒用于自己的任务执行
// 如果没有完成的话，React也会放弃控制权 把控制权交给浏览器
const frameInterval = 5;

const channel = new MessageChannel();
var port2 = channel.port2;
var port1 = channel.port1;
port1.onmessage = performWorkUntilDeadline;

function getCurrentTime() {
  // 为什么用它呢？
  // 因为这个performance, 它返回的时间戳没有被限制在1毫秒的精确度内
  // 可以以浮点数来表示时间，进度最高达到微秒级
  return performance.now();
}
function scheduleCallback(priorityLevel, callback) {
  const currentTime = getCurrentTime();
  const startTime = currentTime;
  let timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = -1;
      break;
    case UserBlockingPriority:
      timeout = userBlockingPriorityTimeout;
      break;
    case IdlePriority:
      timeout = maxSigned31BitInt;
      break;
    case LowPriority:
      timeout = lowPriorityTimeout;
      break;
    case NormalPriority:
    default:
      timeout = normalPriorityTimeout;
      break;
  }
  const expirationTime = startTime + timeout;
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel, // 优先级别
    startTime, // 开始时间
    expirationTime, // 过期时间
    sortIndex: -1, // 排序依据
  };
  // 排序的依据是过期时间
  newTask.sortIndex = expirationTime
  push(taskQueue, newTask);
  requestHostCallback(flushWork);
  return newTask;
}

function flushWork(startTime) {
  return workLoop(startTime);
}

function shouldYieldToHost() {
  // 过去多少时间
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }
  return true;
}

function workLoop(startTime) {
  let currentTime = startTime;
  // 取出优先级最高的任务
  currentTask = peek(taskQueue);

  while (currentTask !== null) {
    // 没有过期 需要放弃执行  过了5毫秒就放弃执行了
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }
    // 取出当前任务中的回调函数
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime
      const continuationCallback = callback(didUserCallbackTimeout);
      // 如果返回了新的函数 表示当前的工作还没有完成
      if (typeof continuationCallback == "function") {
        currentTask.callback = continuationCallback;
        return true;
      }
      // 如果任务已经完成
      if (currentTask == peek(taskQueue)) {
        pop(taskQueue);
      }
    } else {
      pop(taskQueue);
    }
    currentTask = peek(taskQueue);
  }
  // 表示还有更多任务
  if (currentTask !== null) {
    return true;
  }
  return false;
}

function requestHostCallback(flushWork) {
  // 先缓存回调函数
  scheduleHostCallback = flushWork;
  // 执行工作直到结束时间
  schedulePerformWorkUntilDeadline();
}

function schedulePerformWorkUntilDeadline() {
  port2.postMessage(null);
}

function performWorkUntilDeadline() {
  if (scheduleHostCallback) {
    // 获取执行任务的开始时间
    startTime = getCurrentTime();
    let hasMoreWork = true;
    try {
      // 执行 flushWork 并判断有没有返回值
      hasMoreWork = scheduleHostCallback(startTime);
    } finally {
      // 说明有更多工作 有工作就递归 没工作
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline();
      } else {
        scheduleHostCallback = null;
      }
    }
  }
}

export {
  scheduleCallback as unstable_scheduleCallback,
  shouldYieldToHost as unstable_shouldYield,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority
};

// 最小的单位就是fiber