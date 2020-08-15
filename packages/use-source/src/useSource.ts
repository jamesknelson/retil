/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import * as React from 'react'

import { useSourceConcurrent } from './useSourceConcurrent'
import { useSourceSubscription } from './useSourceSubscription'

export const useSource = !!(React as any).unstable_useMutableSource
  ? useSourceConcurrent
  : useSourceSubscription
