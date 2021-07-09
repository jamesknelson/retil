import deepEqual from 'fast-deep-equal'
import React, { ReactNode, useContext, useMemo, useState } from 'react'
import { identity, memoizeOne } from 'retil-support'

import { themeContextContext } from './styleContext'
import { CSSFunction, CSSPropFunction } from './styleTypes'

let nextDownSelectorId = 1

const retilThemeKey = Symbol('retil-css')
type retilThemeKey = typeof retilThemeKey

type SelectorList = boolean | (() => string)

type RetilThemeContext = {
  css: CSSFunction
  selectors: {
    [selectableKey: string]: SelectorList
  }
}

// I'm kinda thinking that maybe selectables should be called behaviors,
// and they shouldn't be designed to support media queries. Media queries
// deserve their own treatment... although the idea of being able to
// specify which query should be used *is* actually kind nice, especially
// when considering the idea of components that can be full screen or
// put on mobile-sized cards.

// TODO: a selectable should actually be a function that can be injected
// directly into a css template function, returning the selector string
// or a selector array with a custom .toString() that produces a list of
// selectors
//
// if applying directly to the connected selectable, we'll prefix with '&'
// otherwise, we'll append '&'
export class Selectable {
  readonly id: number
  readonly stringifiedDefaultSelectors: string

  constructor(readonly defaultSelectors: SelectorList) {
    this.id = nextDownSelectorId++
    this.stringifiedDefaultSelectors = JSON.stringify(defaultSelectors) 
  }

  toString(): string {
    return this.id + ':' + this.stringifiedDefaultSelectors
  }
}

export function createSelectable(
  defaultSelectors: SelectorList,
) {
  return new Selectable(defaultSelectors)
}

export type SelectableEntry = readonly [
  Selectable,
  SelectorList,
]

export interface ProvideSelectablsProps {
  children: ReactNode
  entries: SelectableEntry[]
}

export function ProvideSelectables(props: ProvideSelectablsProps) {
  const { children, entries } = props
  const themeContext = useContext(themeContextContext)
  const theme = useContext(themeContext)

  const parentRetilThemeContext = theme[retilThemeKey] as RetilThemeContext
  const contextSelectors = parentRetilThemeContext.selectors

  // Updating the theme context will cause *all* themed CSS within the children
  // to be re-computed –– not just css relying on selectables –– so we want to
  // avoid updating the context if at all possible by memoizing against a deep
  // equality check.
  const memoize = useMemo(() => memoizeOne(identity, deepEqual), [])
  const selectorsExtension = useMemo(() => {
    const extension = {} as Record<string, SelectorList>

    for (const [downSelector, selectorList] of entries) {
      const stringifiedSelectorList = JSON.stringify(selectorList)

      // this can be a connect
      // we'll always inject something like the following as a separate selector
      //   .retil-n-i.retil-on
      // and we'll start all other selectors with this – which can be disabled even
      // inside a media query
      //   .retil-n-i:not(.retil-off)
      
      // where n is the depth of the connect, and i is the index of
      // the selectable entry -- so that the classes always match between
      // server and client.

      const contextSelectorList = contextSelectors[downSelector.toString()]
      const differsFromParent = 
        contextSelectorList !== undefined
          ? 

      if (stringifiedSelectorList === downSelector.stringifiedDefaultSelectors )
      // TODO: update theme if there are any changes, otherwise return the
      // current theme
    }

    return memoize(extension)
  }, [entries])


  const extendedTheme = useMemo(() => {
    for (const [downSelector, selectorList] of entries) {
      const stringifiedSelectorList = JSON.stringify(selectorList)
      const contextSelectorList = 
      // TODO: update theme if there are any changes, otherwise return the
      // current theme
    }
  }, [entries])

  return (
    <themeContext.Provider value={extendedTheme}>
      {children}
    </themeContext.Provider>
  )
}

/**
 * Takes a down selector, and returns a `css`-like function that can be used
 * either as a string template, or can be passed an object of styles (possibly
 * with other embedded selectors).
 */
export function css<Theme, Props extends { theme: Theme }>(downSelector: Selectable) {
  return ((template: TemplateStringsArray, ...args: Array<any>) =>
    (themeOrProps: Props | Theme) => {
      const theme = ('theme' in themeOrProps ? themeOrProps.theme : themeOrProps) as unknown as { [retilThemeKey]: RetilThemeContext }
      const { css, selectors: downSelectors } = theme[retilThemeKey]

      const mappedArgs = args.map((arg) =>
        isPlainObject(arg)
          ? highStyle(arg)(theme)
          : typeof arg === 'function'
          ? arg(theme)
          : arg,
      )

      const selector = downSelect(highSelector)
      if (selector === true) {
        return css.apply(null, [template, ...mappedArgs])
      } else if (selector) {
        const stringifiedSelector = Array.isArray(selector)
          ? selector.join(', ')
          : selector
        return css`
          ${stringifiedSelector} {
            ${css.apply(null, [template, ...mappedArgs])}
          }
        `
      } else {
        return null
      }
    }) as TCSSFunction
  // TODO: 
  // - return a CSS prop function that pulls the down selector's current
  //   state out of the theme object, or if it's not there, uses the
  //   default value
}