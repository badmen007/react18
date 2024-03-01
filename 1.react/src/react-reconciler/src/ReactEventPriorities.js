import {
  DefaultLane,
  IdleLane,
  InputContinuousLane,
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  includesNonIdleWork,
} from "./ReactFiberLane";

// 默认
export const DefaultEventPriority = DefaultLane;
// 离散的点击事件
export const DiscreteEventPriority = SyncLane;
// 连续事件优先级
export const ContinuousEventPriority = InputContinuousLane;
// 空闲
export const IdleEventPriority = IdleLane;

let currentUpdatePriority = NoLane;

export function getCurrentUpdatePriority() {
  return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority) {
  currentUpdatePriority = newPriority;
}

export function isHigherEventPriority(a, b) {
  return a !== b && a < b
}

export function lanesToEventPriority(lanes) {
  let lane = getHighestPriorityLane(lanes)
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority
  }
  return lane
}
