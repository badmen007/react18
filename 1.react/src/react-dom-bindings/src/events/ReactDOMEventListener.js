import { getEventTarget } from "./getEventTarget";
import { getClosestInstanceFromNode } from "../client/ReactDOMComponentTree";
import { dispatchEventForPluginEventSystem } from './DOMPluginEventSystem'
export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags
) {
  const listenerWrapper = dispatchDiscreteEvent;
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  );
}

/**
 * 派发离散的事件的监听函数 不会连续触发的事件
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 阶段 0 冒泡 4 捕获
 * @param {*} container 容器
 * @param {*} nativeEvent 原生事件
 */
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
}

/**
 * 委托的会调
 * @param {*} domEventName 
 * @param {*} eventSystemFlags 
 * @param {*} container 
 * @param {*} nativeEvent 
 */
export function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  // 获取事件源
  const nativeEventTarget = getEventTarget(nativeEvent)
  const targetInstance = getClosestInstanceFromNode(nativeEventTarget);
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInstance,
    targetContainer // 目标容器
  )
}
