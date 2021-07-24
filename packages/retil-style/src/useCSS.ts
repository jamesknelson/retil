import { useCSSContext } from './context'
import { CSSInterpolationContext, CSSRuntimeFunction } from './cssTypes'

/**
 * Returns a css function from context, allowing for components that work in
 * apps using either styled-components or emotion.
 */
export function useCSS<
  Context extends CSSInterpolationContext = any,
>(): CSSRuntimeFunction<Context> {
  return useCSSContext().runtime
}
