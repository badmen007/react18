const babel = require('@babel/core')

const sourceCode = `
let element = (
  <h1>
    hello <span style={{ color: 'red' }}>world</span>
  </h1>
)
`

const result = babel.transform(sourceCode, {
  plugins: [
    //['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
  ]
})

console.log(result.code)
// 上面的结果被编译成了下面的这种形式 runtime: 'classic'
/*
let element = React.createElement('h1', null, 'hello', React.createElement('span', {
  style: { color: 'red'}
}, 'world'))
*/

// runtimie: 'automatic'

/*
 * import { jsx as _jsx } from 'react/jsx-runtime'
 * let element = _jsx('h1', {
 *  children: ['hello', _jsx('span', {
 *   style: {
 *     color: 'red'
 *   },
 *   children: 'world'
 *  })]
 * })
 *
 */
