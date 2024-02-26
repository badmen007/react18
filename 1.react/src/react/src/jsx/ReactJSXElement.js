import hasOwnProperty from 'shared/hasOwnProperty'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true
}
function hasValidRef(config) {
  return config.ref !== undefined
}
function ReactElement(type, key, ref, props) {
  return { // 下面这个对象就是React元素 也被称为虚拟DOM
    $$typeof: REACT_ELEMENT_TYPE,
    type, //h1 span
    key, // 唯一标识
    ref, // 用来获取真实dom元素的
    props // 属性
  }
}
export function jsxDEV(type, config, maybeKey) {
  // 之前React.createElement的时候儿子需要自己处理 
  // 现在不用自己处理了jsxDEV
  let propName;
  const props = {} // 属性对象
  let ref = null;
  let key = null; // 引入 后面可以通过这实现获取真实DOM的需求
  if (typeof maybeKey !== 'undefined') {
    key = maybeKey
  }
  if (hasValidRef(config)) {
    ref = config.ref
  }
  for (propName in config) {
    if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
      props[propName] = config[propName]
    }
  }
  return ReactElement(type, key, ref, props)
}
