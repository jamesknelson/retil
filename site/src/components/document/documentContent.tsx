import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { MDXProvider } from '@mdx-js/react'
import { AnchorSurface, LinkSurface } from 'retil-interaction'
import { isExternalAction } from 'retil-nav'

import { CodeBlock } from 'site/src/components/codeBlock'
import { columnWidth } from 'site/src/styles/dimensions'
import { colors, palette } from 'site/src/styles/colors'

export interface DocumentContentProps {
  Component: React.ComponentType
}

function Link({ href, ...rest }: any) {
  return isExternalAction(href) ? (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <AnchorSurface href={href} {...rest} />
  ) : (
    <LinkSurface to={href} {...rest} />
  )
}

const baseCSS = css`
  font-size: 1rem;
  line-height: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
`

const baseListCSS = css`
  ${baseCSS};
  padding-left: 1.5rem;
`

const baseHeadingCSS = css`
  ${baseCSS};
  font-weight: 700;
`

// Apply styles directly to MDX elements, so that we can embed unrelated
// components within the document without affecting their styles
const components = {
  a: styled(Link)`
    color: ${palette.purple};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  `,
  blockquote: styled.blockquote`
    position: relative;
    color: ${colors.text.tertiary};
    font-family: serif;
    font-size: 1rem;
    margin-top: 3rem;
    margin-bottom: 3rem;
    padding-left: 3rem;
    &::before {
      content: '“';
      position: absolute;
      left: 0;
      height: 100%;
      width: 2rem;
      font-family: serif;
      font-size: 4rem;
      color: ${colors.ink.light};
      text-align: center;
      padding-top: 1rem;
      box-sizing: border-box;
    }

    > p {
      margin-left: 0 !important;
    }
  `,
  code: styled.code`
    background: ${colors.structure.wash};
    color: inherit;
    font-size: 95%;
    opacity: 0.85;
    padding: 0.15em;
    margin: -0.05em -0.1em;
  `,
  h1: styled.h1`
    font-size: 3rem;
    line-height: 4rem;
    font-weight: 900;
    margin-top: 3rem;
    margin-bottom: 2rem;
  `,
  h2: styled.h2`
    line-height: 3rem;
    font-size: 2rem;
    font-weight: 700;
    margin-top: 2rem;
    margin-bottom: 2rem;
  `,
  h3: styled.h3`
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 2rem;
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  `,
  h4: styled.h4(baseHeadingCSS),
  h5: styled.h5(baseHeadingCSS),
  h6: styled.h6(baseHeadingCSS),
  hr: styled.hr`
    left: 33% !important;
    margin: 3rem auto;
    position: relative;
    width: 33% !important;
  `,
  img: styled.img(baseCSS),
  ol: styled.ol(baseListCSS),
  p: styled.p`
    ${baseCSS};
    word-wrap: break-word;
  `,
  pre: styled(CodeBlock)`
    font-size: 1rem;
    line-height: 1.5rem;
    margin: 1rem 0;
  `,
  strong: styled.strong`
    font-weight: 700;
  `,
  ul: styled.ul(baseListCSS),
}

export function DocumentContent({ Component }: DocumentContentProps) {
  return (
    <MDXProvider components={components}>
      <div
        css={css`
          margin: 2rem auto;
          padding: 0 1rem 1rem;
          max-width: ${columnWidth};
          position: relative;
        `}>
        <Component />
      </div>
    </MDXProvider>
  )
}
