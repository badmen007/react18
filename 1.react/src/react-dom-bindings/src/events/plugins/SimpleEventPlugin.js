import {
  registerSimpleEvents,
  topLevelEventsToReactNames,
} from "../DOMEventProperties";
import { IS_CAPTURE_PHASE } from "../EventSystemFlags";
import { accumulateSinglePhaseListeners } from "../DOMPluginEventSystem";

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
  const reactName = topLevelEventsToReactNames.get(domEventName);
  const listener = accumulateSinglePhaseListeners(
    targetInstance,
    reactName,
    nativeEvent.type,
    isCapturePhase
  );
  console.log(listener, "listener");
}

export { registerSimpleEvents as registerEvents, extractEvents };
