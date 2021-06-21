import { css } from '@emotion/react'

import { colors } from 'site/src/styles/colors'

export interface DocumentFooterProps {
  githubEditURL?: string
}

export function DocumentFooter(props: DocumentFooterProps) {
  return (
    <footer
      css={css`
        border-top: 1px solid ${colors.structure.border};
        padding: 1rem;
        text-align: center;
      `}>
      {props.githubEditURL && (
        <a
          target="_new"
          href={props.githubEditURL}
          css={css`
            color: ${colors.text.tertiary};
            text-decoration: underline;
          `}>
          Edit this page on GitHub
        </a>
      )}
    </footer>
  )
}
