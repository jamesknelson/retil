retil
=====

React Utilities

- [@retil/control](./packages/control): decouple pseudoselector styles from components

<!--

**The React distro that's Just JavaScript.**


## Why Retil?

See those two elephants in the room over there? They're Next.js and Gatsby, and they're big magical frameworks. They're a faustian bargain that takes away your freedom -- forcing decisions on where your code needs to be located, how your requests are handled, and how your data is fetched and serialized. In return, they make it a little easier to get started -- while seriously limiting your options as your project grows.

In contrast, Retil is a collection of independent utilities. It gives you the same power to split code, cache and load data, and do static and server rendering -- but *without* the magic directories, arcane plugin system, or special static methods. But how is this even possible?

**Retil is a React distro** -- a collection of independent packages. It provides you with powerful JavaScript APIs, independent CLI tools, and well documented conventions. By drawing on just the bits you need, you'll be able to make progress in no time -- while still having the freedom to go your own way when the need arises.

One more thing - *Retil is extracted from a real-world production app*. It's built by developers, for developers. As a result, it's incentivized to be small, nimble and maintainable -- *not* to pad VC pockets.

The lowdown? **Retil is Just JavaScript.** And that's why it'll literally only take 2 minutes to create your first app with it. Here's how.


## Getting Started

The easiest way to get started is with the Retil CLI tool. To start, install it with NPM or Yarn:

```bash
npm install -g @retil/cli
# OR
yarn global add @retil/cli
```

Then, you can create a new app using `create-retil-app`

```bash
npx create-retil-app sitbit
cd sitbit
npm start # or yarn start
```

If you prefer TypeScript, you can select the TypeScript template with `--template typescript` -- just as you can with `create-react-app`. In fact, `create-retil-app` is just a wrapper around CRA that adds server rendering and custom webpack configuration -- so if you've used CRA before, you'll feel right at home.

```bash
npx create-retil-app sitbit --template typescript
cd sitbit
npm start # or yarn start
```

If everything has worked, the script should open up your browser to <http://localhost:3000>. You can then click the *View Source* link to check that server rendering is working as advertised, or follow the simple instructions to add your first route. And that's really all there is to it -- Retil is just an extended Create React App with SSR and a bunch of handy utilities to handle routing and data. So now that you're in the know, let's [explore your new toolbox]().


## Roadmap

The current plan for Retil 1.0 calls for the following packages across two repositories: `retil` (this repository)  and `create-retil-app`.


### The `retil` repository

- retil

  An umbrella package that re-exports all other utilities.

- @retil/crawler

  Functions and router middleware for building a list of available URLs and their metadata from a route matcher object.

- @retil/data

  Utilities for populating and maintaining a cache of structured data, e.g. from APIs or local user input.

- @retil/history

  Utilities for creating a @retil/source source that mirrors history on the browser, or a HTTP request on the server.

- @retil/issues

  Utilities for error handling.

- @retil/router

  Utilities for mapping @retil/history requests to relevant state and side effects, and then rendering that state within a React tree.

- @retil/source

  Utilities for creating and manipulating data sources, using reactive programming principles.

- @retil/store

  A central state store for your application, allowing state to be serialized and passed between server, client, and client tabs. Can be configured to store state with Redux (allowing use of redux-dev-tools), or `useReducer()`.


### The `create-retil-app` repository:

- cra-template-retil
- cra-template-retil-typescript
- create-retil-app

  A wrapper around create-react-app that configures it's default scripts to @retil/react-scripts, and it's default template prefix to `cra-template-retil`.

- retil-scripts

  An extension to react-scripts that adds SSR and webpack config customization support.


### Upstream dependencies

Retil is designed to be used with React Suspense. As a result, the release of Retil 1.0 has the following prerequisites:

- Stable release of React's Concurrent Mode
- Suspense support in React's streaming renderer

-->