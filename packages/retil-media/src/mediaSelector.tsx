import React, { useCallback } from 'react'
import {
  CSSSelector,
  CSSTheme,
  Selector,
  getOrRegisterSelectorType,
} from 'retil-css'
import { useFirstInstanceOfLatestValue } from 'retil-support'

export type MediaSelectorConfig = string | boolean

export type MediaSelectorContext = {
  [selectorId: string]: MediaSelectorConfig | null
}

export type MediaSelector = string & Selector<MediaSelectorConfig>

const mediaSelectorTypeKey = (
  selectorId: string,
  defaultConfig: MediaSelectorConfig,
  context?: MediaSelectorContext,
): CSSSelector => {
  const override = context?.[selectorId]
  const config = override ?? defaultConfig
  return typeof config === 'boolean' ? config : '@media ' + config
}

export function createMediaSelector(
  config: MediaSelectorConfig,
): MediaSelector {
  return getOrRegisterSelectorType(mediaSelectorTypeKey).createSelector(config)
}

export interface ProvideMediaQueriesProps {
  children: React.ReactNode
  override:
    | Record<string, MediaSelectorConfig | null>
    | (readonly [string | MediaSelector, MediaSelectorConfig | null])[]
  themeContext?: React.Context<CSSTheme>
}

export function ProvideMediaSelectors(props: ProvideMediaQueriesProps) {
  const { children, override, themeContext } = props

  const { parseSelectorDefinition, useSelectorProvider } =
    getOrRegisterSelectorType(mediaSelectorTypeKey)

  const unmemoizedRawEntries = Array.isArray(override)
    ? override
    : Object.keys(override).map(
        (selector) => [selector, override[selector]] as const,
      )
  const unmemoizedEntries: (readonly [
    selectorId: string,
    defaultConfig: MediaSelectorConfig,
    overrideConfig: MediaSelectorConfig | null,
  ])[] = unmemoizedRawEntries.map(([selector, context]) => {
    const definition =
      typeof selector === 'string'
        ? parseSelectorDefinition(selector)
        : selector
    if (definition === null) {
      throw new TypeError(
        `An unrecoganized selector was passed to the "override" prop of <ProvideMediaSelectors>.`,
      )
    }
    return [String(definition.key), definition.config, context]
  })

  const entries = useFirstInstanceOfLatestValue(
    unmemoizedEntries.filter((entry) => entry[2] !== null),
  )

  const updateContext = useCallback(
    (context?: MediaSelectorContext): MediaSelectorContext | null => {
      const updates = {} as { [key: string]: MediaSelectorConfig | null }
      for (const [selectorId, defaultConfig, overrideConfig] of entries) {
        const currentValue = context?.[selectorId] ?? defaultConfig
        if (overrideConfig !== currentValue) {
          updates[selectorId] = overrideConfig
        }
      }
      return Object.keys(updates).length ? { ...context, ...updates } : null
    },
    [entries],
  )

  const provide = useSelectorProvider(updateContext, themeContext)

  return provide(children)
}
