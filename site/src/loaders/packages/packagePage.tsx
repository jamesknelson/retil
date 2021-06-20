import { css } from '@emotion/react'
import { MDXProvider } from '@mdx-js/react'
import { useCallback, useMemo } from 'react'

import { DocumentContent } from '../../components/documentContent'
import { colors } from '../../styles/colors'

export interface ExamplePageProps {
  IndexDocument?: React.ComponentType<any>
  packageName: string
}
