const randomKey = Math.random().toString(36).slice(2)
const internalInstanceKey = '__reactFiber$' + randomKey
const internalPropsKey = '__reactProps$' + randomKey
/**
 * 真实的dom上获取它对应的fiber节点
 * @param {*} targetNode 
 */
export function getClosestInstanceFromNode(targetNode) {
  const targetInstance = targetNode[internalInstanceKey]
  if (targetInstance) {
    return targetInstance
  }
  return null
}

export function precacheFiberNode(hostInst, node) {
  node[internalInstanceKey] = hostInst
}

export function updateFiberProps(node, props) {
  node[internalPropsKey] = props
}

export function getFiberCurrentPropsFromNode(targetNode) {
  const targetProps = targetNode[internalPropsKey];
  return targetProps
}