## Overview

This Vite config helps you create React websites which that follow a Code As Content paradigm. To facilitate this, it gives you:

- Basic MDX support
- Improved typography
- Syntax highlighting
- Front matter support
- Support for glob-importing front matter or syntax-highlighted versions of your source files


## For contributors

At the time of writing, this package structures its distributables and build system differently to most other packages in this repository. While other packages build both CommonJS and ES Modules distributables, this package builds only ESM, and provides a pre-made CommonJS wrapper to load the ESM build output when CommonJS is required.

This structure is due to the fact that many content processing modules do not provide CommonJS outputs, which means they cannot be imported directly in CommonJS-based vite servers.

