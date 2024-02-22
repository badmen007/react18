import {
  registerSimpleEvents,
  topLevelEventsToReactNames,
} from "../DOMEventProperties";
import { IS_CAPTURE_PHASE } from "../EventSystemFlags";
import { accumulateSinglePhaseListeners } from "../DOMPluginEventSystem";
import { SyntheticMouseEvent } from "../SyntheticEvent";

function extractEvents(
  dispatchQueue,
  domEventName,
  targetInstance,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  // click -> onClick
  const reactName = topLevelEventsToReactNames.get(domEventName);
  let SyntheticEventCtor;
  switch (domEventName) {
    case "click":
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    default:
      break;
  }
  const listeners = accumulateSinglePhaseListeners(
    targetInstance,
    reactName,
    nativeEvent.type,
    isCapturePhase
  );
  if (listeners.length > 0) {
    // 创建合成事件
    const event = new SyntheticEventCtor(
      reactName,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget
    );
    dispatchQueue.push({ event, listeners });
  }
}

export { registerSimpleEvents as registerEvents, extractEvents };
