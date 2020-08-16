/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />

import React from 'react'
import { unstable_createRoot as createRoot } from 'react-dom'

import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
