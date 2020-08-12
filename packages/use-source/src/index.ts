/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import * as React from 'react'

import { useSource as useSourceModern } from './useSource.modern'
import { useSource as useSourceSubscription } from './useSource.subscription'

export const useSource = !!(React as any).unstable_useMutableSource
  ? useSourceModern
  : useSourceSubscription
