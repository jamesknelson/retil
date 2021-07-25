import partition from 'lodash/partition'
import React, { useCallback, useEffect, useRef } from 'react'
import {
  emptyObject,
  fromEntries,
  useFirstInstanceOfLatestValue,
} from 'retil-support'
import {
  CSSSelector,
  CSSTheme,
  Selector,
  getOrRegisterSelectorType,
} from 'retil-style'

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
  boundary?: boolean
  depth?: number
  templateOverrides?: {
    [selectorId: string]: SurfaceSelectorTemplate[] | null
  }
}

const surfaceSelectorTypeKey = (
  selectorId: string,
  defaultConfig: SurfaceSelectorConfig,
  context?: SurfaceSelectorContext,
): CSSSelector => {
  const {
    booleanClassPrefixes,
    boundary = false,
    depth = 0,
    templateOverrides,
  } = context || {}
  const templateOverride = templateOverrides?.[selectorId]
  const config = templateOverride ?? defaultConfig
  const booleanClassPrefix = booleanClassPrefixes?.[selectorId]
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
    return stringifySelectorArray(
      selectors.concat(booleanClassPrefix ? `.${booleanClassPrefix}-on` : []),
      boundary,
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

export interface ConnectSurfaceProps<
  TMergeProps extends ConnectSurfaceSelectorsMergeableProps,
> {
  children: (
    props: TMergeProps & ConnectSurfaceSelectorsMergedProps,
  ) => React.ReactNode
  mergeProps?: TMergeProps
  // A `null` override value gives the surface a hint that the selector
  // may be overridden to true/false – allowing us to add extra classes to
  // handle these situations without updating context.
  override?: SurfaceSelectorOverrides
  themeContext?: React.Context<CSSTheme>
}

export interface ConnectSurfaceSelectorsMergedProps {
  className: string
}

export type ConnectSurfaceSelectorsMergeableProps = {
  className?: string
} & {
  [propName: string]: any
}

export function ConnectSurfaceSelectors<
  TMergeProps extends ConnectSurfaceSelectorsMergeableProps,
>(props: ConnectSurfaceProps<TMergeProps>) {
  const {
    children,
    mergeProps = emptyObject as TMergeProps,
    override = [] as SurfaceSelectorOverridesArray,
    themeContext,
  } = props

  const { parseSelectorDefinition, useSelectorContext, useSelectorProvider } =
    getOrRegisterSelectorType(surfaceSelectorTypeKey)

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
    entries,
    ([, override]) => Array.isArray(override),
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

  const updateBoundaryContext = useCallback(
    (context?: SurfaceSelectorContext) => {
      const depth = (context?.depth || 0) + 1
      return {
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
        boundary: true,
        depth,
        templateOverrides: {
          ...context?.templateOverrides,
          ...fromEntries(templateEntries),
        },
      }
    },
    [booleanSelectorIds, templateEntries],
  )

  const updateInnerContext = useCallback(
    (context?: SurfaceSelectorContext) => ({
      ...updateBoundaryContext(context),
      boundary: false,
    }),
    [updateBoundaryContext],
  )

  const context = useSelectorContext(themeContext)
  const provideBoundaryContext = useSelectorProvider(
    updateBoundaryContext,
    themeContext,
  )
  const provideInnerContext = useSelectorProvider(
    updateInnerContext,
    themeContext,
  )

  const renderProps: ConnectSurfaceSelectorsMergedProps & TMergeProps = {
    ...mergeProps,
    children: mergeProps?.children && provideInnerContext(mergeProps?.children),
    className: maybeBooleanEntries
      .map(([selectorId, binding]) =>
        binding === null
          ? ''
          : `${surfaceClassPrefix}${
              context?.depth || 1
            }-${booleanSelectorIds.indexOf(selectorId)}-${
              binding ? 'on' : 'off'
            }`,
      )
      .concat(`${surfaceClassPrefix}${context?.depth || 1}`)
      .concat(mergeProps?.className || [])
      .join(' '),
  }

  return provideBoundaryContext(children(renderProps))
}

/**
 * Take an array of relative selectors, and add '&' characters as appropriate
 * for the location of this selector relative to the surface it is targeting.
 *
 * Also strips any trailing `~` character, allowing surfaces to be targeted
 * at subsequent siblings.
 */
function stringifySelectorArray(
  selectors: string[],
  isOnBoundary: boolean,
): string {
  return selectors
    .map((selector) =>
      isOnBoundary
        ? '&' + selector.replace(/\s*~\s*&*\s*$/g, '')
        : selector + (selector.trim().slice(-1) !== '&' ? ' &' : ''),
    )
    .join(',')
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
