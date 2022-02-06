import { useCallback, useEffect, useRef } from 'react'
import {
  fromEntries,
  partition,
  useFirstInstanceOfLatestValue,
} from 'retil-support'
import { CSSSelector, Selector, getOrRegisterSelectorType } from 'retil-css'

import { Connector } from './connector'

const baseSelectorSymbol = Symbol.for('retil:css:surfaceSelectorBaseSelector')
const surfaceClassPrefix = 'rx-'

function template(
  strings: TemplateStringsArray,
  ...interpolations: Array<typeof baseSelectorSymbol>
): SurfaceSelectorTemplate {
  if (
    interpolations.some((interpolation) => interpolation !== baseSelectorSymbol)
  ) {
    throw new Error(
      `A "surfaceSelector" tagged template literal can only interpolate the special "surfaceSelector.base" symbol. `,
    )
  } else {
    return [null, ...strings]
  }
}

export type SurfaceSelectorTemplate = [null, ...string[]]

export type SurfaceSelectorInput =
  | boolean
  | string
  | string[]
  | ((
      selector: typeof template,
      surface: typeof baseSelectorSymbol,
    ) => SurfaceSelectorTemplate | SurfaceSelectorTemplate[])

export type SurfaceSelectorConfig = boolean | SurfaceSelectorTemplate[]

export type SurfaceSelector = string & Selector<SurfaceSelectorConfig>

export type SurfaceSelectorOverridesObject = Record<
  string,
  null | SurfaceSelectorInput
>
export type SurfaceSelectorOverridesArray = (readonly [
  string | Selector<SurfaceSelectorConfig>,
  null | SurfaceSelectorInput,
])[]
export type SurfaceSelectorOverrides =
  | SurfaceSelectorOverridesObject
  | SurfaceSelectorOverridesArray

export interface SurfaceSelectorContext {
  booleanClassPrefixes?: {
    [selectorId: string]: string | null
  }
  depth?: number
  templateOverrides?: {
    [selectorId: string]: SurfaceSelectorTemplate[] | null
  }
}

const surfaceSelectorTypeKey = (
  selectorKey: string,
  defaultConfig: SurfaceSelectorConfig,
  context?: SurfaceSelectorContext,
): CSSSelector => {
  const { booleanClassPrefixes, depth = 0, templateOverrides } = context || {}
  const templateOverride = templateOverrides?.[selectorKey]
  const config = templateOverride ?? defaultConfig
  const booleanClassPrefix = booleanClassPrefixes?.[selectorKey]
  if (typeof config === 'boolean' && !booleanClassPrefix) {
    return config
  } else {
    const baseSelector =
      '.' +
      surfaceClassPrefix +
      depth +
      (booleanClassPrefix ? `:not(.${booleanClassPrefix}-off)` : '')
    const selectors =
      config === true
        ? [baseSelector]
        : !config
        ? []
        : config.map(
            (config) =>
              config[1] + config.slice(2).map((part) => baseSelector + part),
          )
    return addAmpersands(
      selectors.concat(booleanClassPrefix ? `.${booleanClassPrefix}-on` : []),
    )
  }
}

function getConfigFromInput(
  input: SurfaceSelectorInput,
): SurfaceSelectorConfig {
  const inputValue =
    typeof input === 'function' ? input(template, baseSelectorSymbol) : input
  return typeof inputValue === 'boolean'
    ? inputValue
    : (typeof inputValue === 'string' || inputValue[0] === null
        ? [inputValue as SurfaceSelectorTemplate | string]
        : (inputValue as SurfaceSelectorTemplate[])
      ).map((configItem) =>
        typeof configItem === 'string'
          ? ([null, '', configItem] as SurfaceSelectorTemplate)
          : configItem,
      )
}

export function createSurfaceSelector(
  input: SurfaceSelectorInput,
): SurfaceSelector {
  return getOrRegisterSelectorType(surfaceSelectorTypeKey).createSelector(
    getConfigFromInput(input),
  )
}

export interface SurfaceSelectorsSnapshot {
  getSelector: (selector: Selector<SurfaceSelectorConfig>) => CSSSelector
}

export interface SurfaceSelectorsMergedProps {
  className: string
}

export type SurfaceSelectorsMergeableProps = {
  className?: string
}

export type MergeSurfaceSelectorsProps = <
  TMergeProps extends SurfaceSelectorsMergeableProps & Record<string, any> = {},
>(
  mergeProps?: TMergeProps,
) => Omit<TMergeProps, keyof SurfaceSelectorsMergeableProps> &
  SurfaceSelectorsMergedProps

export type SurfaceSelectorsConnector = Connector<
  SurfaceSelectorsSnapshot,
  MergeSurfaceSelectorsProps
>

export function useSurfaceSelectorsConnector(
  ...overrides: (SurfaceSelectorOverrides | null | false | undefined)[]
): SurfaceSelectorsConnector {
  const override = mergeOverrides(...overrides)
  const { parseSelectorDefinition, useSelectorContext, useSelectorProvider } =
    getOrRegisterSelectorType(surfaceSelectorTypeKey)

  const context = useSelectorContext()
  const depth = (context?.depth || 0) + 1

  const rawEntries = Array.isArray(override)
    ? override
    : Object.keys(override).map(
        (selector) => [selector, override[selector]] as const,
      )
  const entries: (readonly [string, null | SurfaceSelectorConfig])[] =
    rawEntries.map(([selector, input]) => {
      const definition =
        typeof selector === 'string'
          ? parseSelectorDefinition(selector)
          : selector
      if (definition === null) {
        throw new TypeError(
          `An unrecoganized selector was passed to the "override" prop of <ProvideMediaSelectors>.`,
        )
      }
      return [definition.key, input === null ? null : getConfigFromInput(input)]
    })

  const [unmemoizedStringEntries, maybeBooleanEntries] = partition(
    ([, override]) => Array.isArray(override),
    entries,
  )

  // Keep track of all known overriden selector ids, in the order they've
  // appeared, maintaining reference equality between renders for the
  // `boundSelectorIds` array unless the actual value changes.
  const booleanSelectorIdsFromProps = maybeBooleanEntries.map(
    ([selectorId]) => selectorId,
  )
  const booleanSelectorIdsRef = useRef<string[]>()
  const hasNewSelectorIds =
    !booleanSelectorIdsRef.current ||
    !booleanSelectorIdsFromProps.every(
      booleanSelectorIdsRef.current.includes.bind(
        booleanSelectorIdsRef.current,
      ),
    )
  const booleanSelectorIds = hasNewSelectorIds
    ? booleanSelectorIdsFromProps
    : booleanSelectorIdsRef.current!
  useEffect(() => {
    booleanSelectorIdsRef.current = booleanSelectorIds
  }, [booleanSelectorIds])

  // So long as the entries object stays value-equal between renders, we also
  // want to keep it reference-equal between renders – ensuring our update
  // function (and thus our context) only updates when it needs to.
  const templateEntries = useFirstInstanceOfLatestValue(
    unmemoizedStringEntries as [string, SurfaceSelectorTemplate[]][],
  )

  const updateContext = useCallback(
    (context?: SurfaceSelectorContext) => ({
      booleanClassPrefixes: {
        ...context?.booleanClassPrefixes,
        // Remove any boolean bindings for selectors we're now overriding
        // with a template-based selector
        ...fromEntries(
          templateEntries.map(([selectorId]) => [selectorId, null]),
        ),
        // Add in new boolean classes
        ...fromEntries(
          booleanSelectorIds.map((selectorId, i) => [
            selectorId,
            `${surfaceClassPrefix}${depth}-${i}`,
          ]),
        ),
      },
      depth,
      templateOverrides: {
        ...context?.templateOverrides,
        ...fromEntries(templateEntries),
      },
    }),
    [booleanSelectorIds, depth, templateEntries],
  )

  const getSelector = useCallback(
    (selector: Selector<SurfaceSelectorConfig>) =>
      surfaceSelectorTypeKey(selector.key, selector.config, context),
    [context],
  )

  const mergedClassNames = maybeBooleanEntries
    .map(([selectorId, binding]) =>
      binding === null
        ? ''
        : `${surfaceClassPrefix}${depth}-${booleanSelectorIds.indexOf(
            selectorId,
          )}-${binding ? 'on' : 'off'}`,
    )
    .concat(`${surfaceClassPrefix}${depth}`)

  const mergeSurfaceSelectorsProps: MergeSurfaceSelectorsProps = (
    mergeProps,
  ) => ({
    ...mergeProps!,
    className: mergedClassNames.concat(mergeProps?.className || []).join(' '),
  })

  const provideContext = useSelectorProvider(updateContext)

  return [{ getSelector }, mergeSurfaceSelectorsProps, provideContext]
}

/**
 * Take an array of relative selectors, and add '&' characters if they're not
 * already specified.
 */
function addAmpersands(selectors: string[]): string[] {
  return selectors.map(
    (selector) => selector + (selector.indexOf('&') === -1 ? ' &' : ''),
  )
}

export function mergeOverrides(
  ...overrides: (SurfaceSelectorOverrides | null | false | undefined)[]
): SurfaceSelectorOverridesArray {
  return Array.from(
    new Map(
      ([] as SurfaceSelectorOverridesArray).concat(
        ...overrides.map((override) =>
          !override
            ? []
            : Array.isArray(override)
            ? override
            : Object.keys(override).map(
                (selector) => [selector, override[selector]] as const,
              ),
        ),
      ),
    ).entries(),
  )
}
