/**
 * 渲染函数组件 
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 
 * @param {*} props 
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  const children = Component(props)
  return children
}