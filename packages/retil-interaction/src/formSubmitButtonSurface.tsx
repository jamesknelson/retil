import React, { forwardRef } from 'react'

import { ConnectSurface, SurfaceProps, splitSurfaceProps } from './surface'

export interface FormSubmitButtonSurfaceProps
  extends SurfaceProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {}

// TODO:
// - ensure keyboard events are being handled correctly

export const FormSubmitButtonSurface = forwardRef<
  HTMLButtonElement,
  FormSubmitButtonSurfaceProps
>((props, ref) => {
  const [surfaceProps, buttonProps] = splitSurfaceProps(props)

  return (
    <ConnectSurface {...surfaceProps} mergeProps={{ ...buttonProps, ref }}>
      {(props) => (
        <button
          {...props}
          // Add both a real disabled attribute along with aria-disabled, as
          // the real disabled attribute will disable the form, while
          // aria-disabled is used in the retil-style downselector.
          disabled={props['aria-disabled']}
          type="submit"
        />
      )}
    </ConnectSurface>
  )
})
