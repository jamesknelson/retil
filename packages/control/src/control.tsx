import React, { useContext, useMemo } from 'react'
import {
  StyledComponent,
  StyledComponentProps,
  ThemeContext,
} from 'styled-components'

export interface Control {
  getNamedCSSSelector: (selectorName: string) => string

  // When defined, these flags should override any styles defined by CSS pseudo
  // selectors.
  //
  // While these can be handled in many cases via CSS selectors, there are times
  // when you'll want to be able to manually set them too. For example, consider
  // a tutorial where you want to temporarily show a control in a different
  // state.
  forceSelectors: {
    [selectorName: string]: boolean
  }
}

export const defaultControl: Control = {
  getNamedCSSSelector: (selectorName: string) => `&:${selectorName}`,
  forceSelectors: {},
}

export type ControlComponentProps<
  C extends keyof JSX.IntrinsicElements | React.ComponentType<any>,
  T extends object,
  O extends object = {},
  A extends keyof any = never
> = StyledComponentProps<C, T, O, A> & {
  forceSelectors?: {
    [selectorName: string]: boolean
  }
}

export function control<
  C extends keyof JSX.IntrinsicElements | React.ComponentType<any>,
  T extends object,
  O extends object = {},
  A extends keyof any = never
>(
  Component: StyledComponent<C, T, O, A>,
  getSelectorOption?: (selectorName: string) => string,
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ControlComponentProps<C, T, O, A>> &
    React.RefAttributes<any>
> {
  const getSelector = getSelectorOption || createDefaultGetSelector(Component)

  const Control = React.forwardRef<any, ControlComponentProps<C, T, O, A>>(
    (props, ref) => {
      const { forceSelectors = {}, ...rest } = props

      // Add support for a `disabled` prop to the control, even if the
      // underlying HTML doesn't support it
      if (
        'disabled' in rest &&
        rest['disabled'] &&
        forceSelectors['disabled'] === undefined
      ) {
        forceSelectors['active'] = false
        forceSelectors['disabled'] = true
        forceSelectors['hover'] = false
      }

      const theme = useContext(ThemeContext)
      const patchedTheme = useMemo(() => {
        const control: Control = {
          getNamedCSSSelector: getSelector,
          forceSelectors,
        }
        return {
          ...theme,
          '@retil/control': control,
        }
      }, [forceSelectors, theme])

      return (
        <ThemeContext.Provider value={patchedTheme}>
          <Component {...(rest as any)} ref={ref}>
            {props.children}
          </Component>
        </ThemeContext.Provider>
      )
    },
  )

  Control.displayName = `control(${
    Component.displayName || Component.name || ''
  })`

  return Control
}

const createDefaultGetSelector = (
  Component: StyledComponent<any, any, any, any>,
) => (selectorName: string) => `${Component}:${selectorName} &`
