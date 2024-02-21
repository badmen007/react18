import { registerTwoPhaseEvent } from "./EventRegistry";
const simpleEventPluginEvents = ["click"];
export const topLevelEventsToReactNames = new Map()

function registerSimpleEvent(domEventName, reactName) {
  topLevelEventsToReactNames.set(domEventName, reactName)
  registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents() {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];
    const domEventName = eventName.toLocaleLowerCase();
    const capitalizeEvent = eventName[0].toUpperCase() + eventName.slice(1);
    registerSimpleEvent(domEventName, `on${capitalizeEvent}`);
  }
}
