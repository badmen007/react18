import assign from "shared/assign";

function functionThatReturnsTrue() {
  return true
}
function functionThatReturnsFalse() {
  return false
}
const MouseEventInterface = {
  clientX: 0,
  clientY: 0,
};
function createSyntheticEvent(inter) {
  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this._reactName = reactName
    this.type = reactEventType;
    this._targetInst = targetInst;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    for(const propName in inter) {
      if (!inter.hasOwnProperty(propName)){ 
        continue
      }
      this[propName] = nativeEvent[propName]
    }
    // 阻止默认事件
    this.isDefaultPrevented = functionThatReturnsFalse
    // 阻止冒泡
    this.isPropagationStopped = functionThatReturnsFalse;
    return this
  }
  assign(SyntheticBaseEvent.prototype, {
    preventDefault() {
      const event = this.nativeEvent
      if (event.preventDefault) {
        event.preventDefault()
      } else {
        event.returnValue = false
      }
      this.isDefaultPrevented = functionThatReturnsTrue
    },
    stopPropagation() {
       const event = this.nativeEvent
      if (event.stopPropagation) {
        event.stopPropagation()
      } else {
        event.cancelBubble = true
      }
      this.isPropagationStopped = functionThatReturnsTrue
    }
  })
  return SyntheticBaseEvent;
}
export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);
