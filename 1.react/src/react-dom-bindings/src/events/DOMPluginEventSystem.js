import { allNativeEvents } from "./EventRegistry";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import {
  addEventCaptureListener,
  addEventBubbleListener,
} from "./EventListener";
import { getEventTarget } from "./getEventTarget";
import { HostComponent } from "react-reconciler/src/ReactWorkTags";
import getListener from "./getListener";

SimpleEventPlugin.registerEvents();
const listeningMarker = `_reactListening` + Math.random().toString(36).slice(2);

export function listenToAllSupportedEvents(rootContainerElement) {
  // 监听根容器 div#root只监听一次
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;
    allNativeEvents.forEach((domEventName) => {
      listenToNativeEvent(domEventName, true, rootContainerElement);
      listenToNativeEvent(domEventName, false, rootContainerElement);
    });
  }
}

/**
 *
 * @param {*} domEventName 原生事件
 * @param {*} isCapturePhaseListener 是否捕获
 * @param {*} target div#root
 */
export function listenToNativeEvent(
  domEventName,
  isCapturePhaseListener,
  target
) {
  let eventSystemFlags = 0; // 默认就是0
  if (isCapturePhaseListener) {
    eventSystemFlags |= IS_CAPTURE_PHASE;
  }
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener
  );
}

function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener
) {
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags
  );
  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener);
  } else {
    addEventBubbleListener(targetContainer, domEventName, listener);
  }
}

export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInstance,
  targetContainer
) {
  dispatchEventForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInstance,
    targetContainer
  );
}

function dispatchEventForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInstance,
  targetContainer
) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue = [];
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInstance,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
  console.log(dispatchQueue);
}

function extractEvents(
  dispatchQueue,
  domEventName,
  targetInstance,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInstance,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
}

export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase
) {
  const captureName = reactName + "Capture";
  const reactEventName = isCapturePhase ? captureName : reactName;
  const listeners = [];
  let instance = targetFiber;
  while (instance !== null) {
    const { stateNode, tag } = instance;
    if (tag === HostComponent && stateNode !== null) {
      const listener = getListener(instance, reactEventName);
      if (listener) {
        listeners.push(listener);
      }
    }
    instance = instance.return;
  }
  return listeners;
}
