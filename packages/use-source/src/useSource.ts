/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import * as React from 'react'

import { useSourceModern } from './useSourceModern'
import { useSourceLegacy } from './useSourceLegacy'

export const useSource = !!(React as any).unstable_useMutableSource
  ? useSourceModern
  : useSourceLegacy
