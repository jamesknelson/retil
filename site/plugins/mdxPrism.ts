import parseNumericRange from 'parse-numeric-range'
import rehype from 'rehype'
import visit from 'unist-util-visit'
import nodeToString from 'hast-util-to-string'
import unified, { Plugin } from 'unified'
import parse from 'rehype-parse'
import refractor from 'refractor'

/**
 * This module walks through the node tree and does:
 * - gets the class name
 * - parses the class and extracts the highlight lines directive and the language name
 * - highlights the code using refractor
 * - if markers are present then:
 *    - converts AST to HTML
 *    - then applies some fixes to make line highlighting work with JSX found here: https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-remark-prismjs/src/directives.js#L113-L119
 *    - add markers using: https://github.com/rexxars/react-refractor/blob/master/src/addMarkers.js
 *    - converts the code back from HTML to AST
 *  - sets the code as value
 */

export interface MDXPrismOptions {
  ignoreMissing?: boolean
}

const mdxPrism: Plugin = (options = {}) => {
  const visitor: visit.Visitor<any> = (node, _index, parent) => {
    if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
      return
    }

    const className = getLangClass(node)
    const parseResult = parseLineNumberRange(className)

    if (!parseResult) {
      return
    }

    const { highlightLines, splitLanguage } = parseResult
    const lang = getLanguage(splitLanguage)
    const markers = highlightLines

    if (lang === null) {
      return
    }

    let result
    try {
      result = refractor.highlight(nodeToString(node), lang)

      if (markers && markers.length > 0) {
        // This blocks attempts this fix:
        // https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-remark-prismjs/src/directives.js#L113-L119
        const PLAIN_TEXT_WITH_LF_TEST =
          /<span class="token plain-text">[^<]*\n[^<]*<\/span>/g

        // AST to HTML
        let html_ = rehype()
          .stringify({ type: 'root', children: result })
          .toString()

        // Fix JSX issue
        html_ = html_.replace(PLAIN_TEXT_WITH_LF_TEST, (match) => {
          return match.replace(
            /\n/g,
            '</span>\n<span class="token plain-text">',
          )
        })

        // HTML to AST
        const hast_ = unified()
          .use(parse, { emitParseErrors: true, fragment: true })
          .parse(html_)

        // Add markers
        result = addMarkers(hast_.children, { markers })
      }
    } catch (err) {
      if (options.ignoreMissing && /Unknown language/.test(err.message)) {
        return
      }

      throw err
    }

    const parentProperties = parent?.properties as
      | Record<string, string>
      | undefined
    if (parentProperties) {
      parentProperties['data-language'] = lang
      if (highlightLines) {
        parentProperties['data-highlighted-line-numbers'] =
          highlightLines.join(',')
      }
    }

    node.children = result
  }

  return (tree) => {
    visit(tree, 'element', visitor)
  }
}

const parseLineNumberRange = (language: string) => {
  if (!language) {
    return ''
  }
  if (language.split('{').length > 1) {
    let [splitLanguage, ...options] = language.split('{')
    let highlightLines = [] as any[]
    options.forEach((option: string) => {
      option = option.slice(0, -1)
      if (parseNumericRange(option).length > 0) {
        highlightLines = parseNumericRange(option).filter((n) => n > 0)
      }
    })

    return {
      splitLanguage,
      highlightLines,
    }
  }

  return { splitLanguage: language }
}

function getLangClass(node: any) {
  const className = node.properties.className || []
  for (const item of className) {
    if (item.slice(0, 9) === 'language-') {
      return item
    }
  }
  return null
}

function getLanguage(className = '') {
  if (className.slice(0, 9) === 'language-') {
    return className.slice(9).toLowerCase()
  }

  return null
}

/**
 * Code <s>copied</s> inspired from from: https://github.com/rexxars/react-refractor/blob/master/src/addMarkers.js
 */
function lineNumberify(ast: any, lineNum = 1) {
  let lineNumber = lineNum
  return ast.reduce(
    (result: any, node: any) => {
      if (node.type === 'text') {
        if (node.value.indexOf('\n') === -1) {
          node.lineNumber = lineNumber
          result.nodes.push(node)
          return result
        }

        const lines = node.value.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (i !== 0) ++lineNumber
          if (i === lines.length - 1 && lines[i].length === 0) continue
          result.nodes.push({
            type: 'text',
            value: i === lines.length - 1 ? lines[i] : `${lines[i]}\n`,
            lineNumber: lineNumber,
          })
        }

        result.lineNumber = lineNumber
        return result
      }

      if (node.children) {
        node.lineNumber = lineNumber
        const processed = lineNumberify(node.children, lineNumber)
        node.children = processed.nodes
        result.lineNumber = processed.lineNumber
        result.nodes.push(node)
        return result
      }

      result.nodes.push(node)
      return result
    },
    { nodes: [], lineNumber: lineNumber },
  )
}

function wrapLines(ast: any, markers: any, options: any) {
  let i = 0
  const wrapped = markers.reduce((nodes: any, marker: any) => {
    const line = marker.line
    const children = []
    for (; i < ast.length; i++) {
      if (ast[i].lineNumber < line) {
        nodes.push(ast[i])
        continue
      }

      if (ast[i].lineNumber === line) {
        children.push(ast[i])
        continue
      }

      if (ast[i].lineNumber > line) {
        break
      }
    }

    nodes.push({
      type: 'element',
      tagName: marker.component || 'div',
      properties: marker.component
        ? options
        : { className: marker.className || 'mdx-marker' },
      children: children,
      lineNumber: line,
    })

    return nodes
  }, [])

  for (; i < ast.length; i++) {
    wrapped.push(ast[i])
  }

  return wrapped
}

function addMarkers(ast: any, options: { markers: any[] }) {
  const markers = options.markers
    .map((marker) => {
      return marker.line ? marker : { line: marker }
    })
    .sort((nodeA, nodeB) => {
      return nodeA.line - nodeB.line
    })

  const numbered = lineNumberify(ast).nodes
  const wrapped = wrapLines(numbered, markers, options)
  return wrapped
}

export default mdxPrism
