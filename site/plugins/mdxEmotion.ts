import { useMDXComponents } from '@mdx-js/react'
import { jsx as emotionJSX } from '@emotion/react'
import React, { Fragment, forwardRef } from 'react'

const TYPE_PROP_NAME = 'mdxType'

const Wrapper: React.FunctionComponent = ({ children }) =>
  emotionJSX(Fragment, {}, children)

const DEFAULTS: Record<string, React.ComponentType | string> = {
  inlineCode: 'code',
  wrapper: Wrapper,
}

const MDXCreateElement = forwardRef((props: any, ref) => {
  const {
    components: propComponents,
    mdxType,
    originalType,
    parentName,
    ...etc
  } = props

  const components = useMDXComponents(propComponents)
  const type = mdxType
  const Component =
    components[`${parentName}.${type}`] ||
    components[type] ||
    DEFAULTS[type] ||
    originalType

  /* istanbul ignore if - To do: what is this useful for? */
  if (propComponents) {
    return emotionJSX(Component, {
      ref,
      ...etc,
      components: propComponents,
    })
  }

  return emotionJSX(Component, { ref, ...etc })
})

MDXCreateElement.displayName = 'MDXCreateElement'

function mdx(type: React.ComponentType | string, props: any) {
  const args = arguments
  const mdxType = props && props.mdxType

  if (typeof type === 'string' || mdxType) {
    const argsLength = args.length

    const createElementArgArray = new Array(argsLength)
    createElementArgArray[0] = MDXCreateElement

    const newProps = {} as Record<string, any>
    for (let key in props) {
      /* istanbul ignore else - folks putting stuff in `prototype`. */
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        newProps[key] = props[key]
      }
    }

    newProps.originalType = type
    newProps[TYPE_PROP_NAME] = typeof type === 'string' ? type : mdxType

    createElementArgArray[1] = newProps

    for (let i = 2; i < argsLength; i++) {
      createElementArgArray[i] = args[i]
    }

    return emotionJSX.apply(null, createElementArgArray as any)
  }

  return emotionJSX.apply(null, args as any)
}

mdx.Fragment = Fragment

export { mdx }
