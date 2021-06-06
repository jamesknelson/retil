import { useContext, useMemo } from 'react'
import { isPlainObject } from 'retil-support'

import { useDownSelect } from './downSelect'
import { cssFunctionContext } from './styleContext'
import { DownSelect, HighStyle, CSSPropFunction } from './styleTypes'
import { useHighStyle } from './useHighStyle'

export const useCSS = <
  Theme,
  HighSelector extends string,
  TCSSFunction extends (
    template: TemplateStringsArray,
    ...args: Array<any>
  ) => any,
>(
  overrideDownSelect?: DownSelect<HighSelector>,
): { [highSelector in HighSelector]: TCSSFunction } &
  TCSSFunction &
  ((highStyle: HighStyle<Theme, HighSelector>) => CSSPropFunction<Theme>) => {
  const css = useContext(cssFunctionContext)
  const downSelect = useDownSelect(overrideDownSelect)
  const highStyle = useHighStyle(downSelect)

  return useMemo(() => {
    const createTemplateFunction = (highSelector: HighSelector) =>
      ((template: TemplateStringsArray, ...args: Array<any>) =>
        (theme: unknown) => {
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

    const cache = {} as { [highSelector: string]: TCSSFunction }

    const proxy: any = new Proxy(css, {
      get: (_target, prop: HighSelector) => {
        if (prop in css) {
          return css[prop as never]
        }
        if (!cache[prop]) {
          cache[prop] = createTemplateFunction(prop)
        }
        return cache[prop]
      },
      apply: function (_target, that, args) {
        if (args.length === 1 && isPlainObject(args[0])) {
          return highStyle(args[0])
        }
        return css.apply(that, args as any)
      },
    })

    return proxy
  }, [css, downSelect, highStyle])
}
