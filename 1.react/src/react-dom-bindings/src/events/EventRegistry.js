export const allNativeEvents = new Set();

/**
 * 注册事件
 * @param {*} registrationName react事件名
 * @param {*} dependencies 原生事件数组
 */
export function registerTwoPhaseEvent(registrationName, dependencies) {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + "Capture", dependencies);
}

export function registerDirectEvent(registrationName, dependencies) {
  for(let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i])
  }
}