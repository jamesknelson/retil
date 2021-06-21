import { css } from '@emotion/react'

import { codeColors } from 'site/src/styles/colors'

export interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  'data-highlighted-line-numbers'?: string
  'data-language'?: string
  theme?: 'dark' | 'light'
}

export function CodeBlock(props: CodeBlockProps) {
  const {
    children,
    className,
    'data-language': language = 'text',
    theme = 'light',
    ...rest
  } = props

  const colors = codeColors[theme]

  return (
    <pre
      {...rest}
      className={[className, 'language-' + language].join(' ')}
      css={css`
        background: ${colors.background};
        border-radius: 5px;
        margin: 0;

        &,
        & > code {
          color: ${colors.text} !important;
          font-family: monospace;
          text-align: left;
          white-space: pre;
          word-spacing: normal;
          word-break: normal;
          word-wrap: normal;
          font-size: 14px;
          line-height: 1.3 !important;

          -moz-tab-size: 4;
          -o-tab-size: 4;
          tab-size: 4;

          -webkit-hyphens: none;
          -moz-hyphens: none;
          -ms-hyphens: none;
          hyphens: none;
        }

        code {
          background-color: transparent;
        }

        .highlighted-line {
          background-color: rgba(255, 255, 255, 0.4);
          display: block;
          margin-right: -16px;
          margin-left: -16px;
          padding-right: 1em;
          padding-left: 0.75em;
          border-left: 3px solid ${colors.entity};
        }

        .token.comment,
        .token.block-comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: ${colors.comment};
        }

        .token.punctuation {
          color: ${colors.text};
        }

        .token.tag {
          color: ${colors.tag};
        }

        .token.function-name {
          color: ${colors.variable1};
        }

        .token.boolean,
        .token.number {
          color: ${colors.number};
        }

        .token.function {
          color: ${colors.function};
        }

        .token.namespace,
        .token.deleted,
        .token.attr-name,
        .token.property,
        .token.class-name,
        .token.constant,
        .token.symbol {
          color: ${colors.propAttr};
        }

        .token.selector,
        .token.important,
        .token.atrule,
        .token.keyword,
        .token.builtin {
          color: ${colors.keyword};
        }

        .token.string,
        .token.char,
        .token.attr-value,
        .token.regex {
          color: ${colors.string};
        }

        .token.variable {
          color: ${colors.variable1};
        }

        .token.operator {
          color: ${colors.operator};
        }

        .token.entity,
        .token.url {
          color: ${colors.entity};
        }

        .token.important,
        .token.bold {
          font-weight: bold;
        }
        .token.italic {
          font-style: italic;
        }

        .token.entity {
          cursor: help;
        }

        .token.inserted {
          color: ${colors.function};
        }
      `}>
      {children}
    </pre>
  )
}
