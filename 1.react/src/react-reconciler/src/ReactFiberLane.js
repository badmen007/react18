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

export function markRootUpdated(root, updateLane) {
  root.pendingLanes |= updateLane;
}

export function getNextLanes(root) {
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes);
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
  return (lanes & NonIdleLanes) !== NoLanes
}

export function isSubsetOfLanes(set, subset) {
  return (set & subset) == subset;
}

export function mergeLanes(a, b) {
  return a | b;
}