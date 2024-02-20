import { setValueForStyles } from "./CSSPropertyOperations";
import setTextContent from "./setTextContent";
import {setValueForProperty} from './DOMPropertyOperations'
const STYLE = 'style'
const CHILDREN = 'children'

function setInitialDOMProperties(tag, domElement, props) {
  for(const propKey in props) {
    if (props.hasOwnProperty(propKey)) {
      const nextProp = props[propKey]
      if (propKey === STYLE) {
        setValueForStyles(domElement, nextProp)
      } else if (propKey == CHILDREN) {
        if (typeof nextProp === 'string') {
          setTextContent(domElement, nextProp+'')
        }
      } else if (nextProp !== null) {
        setValueForProperty(domElement, propKey, nextProp)
      }
    }
  }
}

export function setInitialProperties(domElement, tag, props) {
  setInitialDOMProperties(tag, domElement, props)
}