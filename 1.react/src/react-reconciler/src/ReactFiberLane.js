import { allowConcurrentByDefault } from "scheduler/src/SchedulerFeatureFlags";

export const TotalLanes = 31;

export const NoLanes = 0b0000000000000000000000000000000;
export const NoLane = 0b0000000000000000000000000000000;

export const SyncHydrationLane = 0b0000000000000000000000000000001;
export const SyncLane = 0b0000000000000000000000000000010;

export const InputContinuousHydrationLane = 0b0000000000000000000000000000100;
export const InputContinuousLane = 0b0000000000000000000000000001000;

export const DefaultHydrationLane = 0b0000000000000000000000000010000;
export const DefaultLane = 0b0000000000000000000000000100000;

export const SelectiveHydrationLane = 0b0000100000000000000000000000000;

const NonIdleLanes = 0b0000111111111111111111111111111;

export const IdleHydrationLane = 0b0001000000000000000000000000000;
export const IdleLane = 0b0010000000000000000000000000000;

export const OffscreenLane = 0b0100000000000000000000000000000;
export const DeferredLane = 0b1000000000000000000000000000000;

export const NoTimestamp = -1;

export function markRootUpdated(root, updateLane) {
  root.pendingLanes |= updateLane;
}

export function getNextLanes(root, wipLanes) {
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes);
  if (wipLanes !== NoLane && wipLanes !== nextLanes) {
    // 新的车道的值比渲染中的车道大， 说明新的车道优先级更低
    if (nextLanes > wipLanes) {
      return wipLanes;
    }
  }
  return nextLanes;
}

export function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes);
}

// 只能返回一个车道
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}

export function includesNonIdleWork(lanes) {
  return (lanes & NonIdleLanes) !== NoLanes;
}

export function isSubsetOfLanes(set, subset) {
  return (set & subset) == subset;
}

export function mergeLanes(a, b) {
  return a | b;
}

export function includesBlockingLane(root, lanes) {
  if (allowConcurrentByDefault) {
    return false;
  }
  const SyncDefaultLanes = InputContinuousLane | DefaultLane;
  return (lanes & SyncDefaultLanes) !== NoLane;
}

function pickArbitraryLaneIndex(lanes) {
  // clz21 就是拿最左边的1左边有多少个0
  return 31 - Math.clz32(lanes);
}

export function markStarvedLanesAsExpired(root, currentTime) {
  const pendingLanes = root.pendingLanes;
  const expirationTimes = root.expirationTimes;
  let lanes = pendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    const expirationTime = expirationTimes[index];
    if (expirationTime === NoTimestamp) {
      expirationTimes[index] = computeExpirationTime(lane, currentTime);
    } else if (expirationTime <= currentTime) {
      root.expiredLanes |= lane;
    }
    lanes &= ~lane;
  }
}

function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
    case InputContinuousLane:
      return currentTime + 250;
    case DefaultLane:
      return currentTime + 5000;
    case IdleLane:
      return NoTimestamp;
    default:
      return NoTimestamp;
  }
}

export function createLaneMap(initial) {
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}

export function includesExpiredLane(root, lanes) {
  return (lanes & root.expiredLanes) !== NoLanes;
}

export function markRootFinished(root, remainingLanes) {
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
  root.pendingLanes = remainingLanes;
  const expirationTimes = root.expirationTimes;
  let lanes = noLongerPendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    expirationTimes[index] = NoTimestamp;
    lanes &= ~lane;
  }
}
