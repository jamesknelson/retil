import { css } from '@emotion/react'
import styled from '@emotion/styled'

import { CodeBlock } from 'site/src/components/codeBlock'
import { Link } from 'site/src/components/link'
import { colors, palette } from 'site/src/styles/colors'
import { columnWidth } from 'site/src/styles/dimensions'

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

export const DocTitle = styled.h1`
  line-height: 3rem;
  font-size: 2rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 2rem;
`
export const DocHeading = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 2rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
`
export const DocSubHeading = styled.h3(baseHeadingCSS)

export const DocLink = styled(Link)`
  color: ${palette.purple};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

export const DocParagraph = styled.p`
  ${baseCSS};
  word-wrap: break-word;
`

export const DocBlockquote = styled.blockquote`
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

  ${DocParagraph} {
    margin-left: 0 !important;
  }
`

export const DocCode = styled.code`
  background: ${colors.structure.wash};
  color: inherit;
  font-size: 95%;
  opacity: 0.85;
  padding: 0.15em;
  margin: -0.05em -0.1em;
`
export const DocCodeBlock = styled(CodeBlock)`
  font-size: 1rem;
  line-height: 1.5rem;
  margin: 1rem 0;
`
export const DocHorizontalRule = styled.hr`
  left: 33% !important;
  margin: 3rem auto;
  position: relative;
  width: 33% !important;
`
export const DocImage = styled.img(baseCSS)
export const DocOrderedList = styled.ol(baseListCSS)
export const DocUnorderedList = styled.ul(baseListCSS)

export const DocEmphasis = styled.em`
  font-style: italic;
`
export const DocStrong = styled.strong`
  font-weight: 700;
`

export const DocWrapper = styled.div`
  margin: 2rem auto;
  padding: 0 1rem 1rem;
  max-width: ${columnWidth};
  position: relative;
`
