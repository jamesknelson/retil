import React, { useCallback } from 'react'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (text: string) => void
}

export function Input(props: InputProps) {
  const { onChange, ...rest } = props

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(event.target.value)
      }
    },
    [onChange],
  )

  return <input {...(rest as any)} onChange={handleChange} />
}
