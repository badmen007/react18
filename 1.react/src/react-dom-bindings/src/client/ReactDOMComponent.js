import { setValueForStyles } from "./CSSPropertyOperations";
import setTextContent from "./setTextContent";
import { setValueForProperty } from "./DOMPropertyOperations";
const STYLE = "style";
const CHILDREN = "children";

function setInitialDOMProperties(tag, domElement, props) {
  for (const propKey in props) {
    if (props.hasOwnProperty(propKey)) {
      const nextProp = props[propKey];
      if (propKey === STYLE) {
        setValueForStyles(domElement, nextProp);
      } else if (propKey == CHILDREN) {
        if (typeof nextProp === "string") {
          setTextContent(domElement, nextProp + "");
        } else if (typeof nextProp === "number") {
          setTextContent(domElement, `${nextProp}`);
        }
      } else if (nextProp !== null) {
        setValueForProperty(domElement, propKey, nextProp);
      }
    }
  }
}

export function setInitialProperties(domElement, tag, props) {
  setInitialDOMProperties(tag, domElement, props);
}

export function diffProperties(domElement, tag, lastProps, nextProps) {
  let uploadPayload = null;
  let propKey;
  let styleName;
  let styleUpdates = null;

  // 如果一个属性在老的对象里有，新的对象中没有的话，那就意味着删除
  for (propKey in lastProps) {
    if (
      nextProps.hasOwnProperty(propKey) ||
      !lastProps.hasOwnProperty(propKey) ||
      lastProps[propKey] == null
    ) {
      continue;
    }
    if (propKey == STYLE) {
      const lastStyle = lastProps[propKey];
      for (styleName in lastStyle) {
        if (lastStyle.hasOwnProperty(styleName)) {
          if (!styleUpdates) {
            styleUpdates = {};
          }
          styleUpdates[styleName] = "";
        }
      }
    } else {
      (updatePayload = uploadPayload || []).push(propKey, null);
    }
  }
  for (let propKey in nextProps) {
    const nextProp = nextProps[propKey]; // 新属性中的值
    // 老属性中的值
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined;
    if (
      !nextProps.hasOwnProperty(propKey) ||
      nextProp == lastProp ||
      (nextProp == null && lastProp == null)
    ) {
      continue;
    }
    if (propKey == STYLE) {
      if (lastProp) {
        for (styleName in lastProp) {
          if (
            lastProp.hasOwnProperty(styleName) &&
            (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = "";
          }
        }
        // 遍历新的样式对象
        for (styleName in nextProp) {
          if (
            nextProps.hasOwnProperty(styleName) &&
            lastProp[styleName] !== nextProp[styleName]
          ) {
            if (!styleUpdates) styleUpdates = {};
            styleUpdates[styleName] = nextProp[styleName];
          }
        }
      }
    } else if (propKey == CHILDREN) {
      if (typeof nextProp == "string" || typeof nextProp == "number") {
        (uploadPayload = uploadPayload || []).push(propKey, nextProp);
      }
    } else {
      (uploadPayload = uploadPayload || []).push(propKey, nextProp);
    }
  }
  if (styleUpdates) {
    (uploadPayload = uploadPayload || []).push(STYLE, styleUpdates);
  }
  return uploadPayload;
}

export function updateProperties(
  domElement,
  updatePayload,
  type,
  oldProps,
  newProps
) {
  updateDOMProperties(domElement, updatePayload)
}

function updateDOMProperties(domElement, updatePayload) {
  for(let i = 0; i < updatePayload.length; i+=2) {
    const propKey = updatePayload[i]
    const propValue = updatePayload[i+1]
    if (propKey === STYLE) {
      setValueForStyles(domElement, propValue)
    } else if (propKey == CHILDREN) {
      setTextContent(domElement, propValue)
    } else {
      setValueForProperty(domElement, propKey, propValue)
    }
  }
}