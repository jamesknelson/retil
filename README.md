retil
=====

**Superpowers for React Developers.**

Retil takes care of your app's foundation -- including authentication, routing, validation, async operations, and external state management -- so that you can focus on the bits that matter. It works great with both CRA *and* Next.js. It's built for React concurrent mode. It supports spiffy animated route transitions.

And you can start using it by importing a single hook.

Curious piqued?

[Try the `/examples` &ndash; they're as easy as `yarn start`](./examples)


## Introducing Retil

Retil is a collection of React Utilities that are designed to work together and complement each other, with packages for:

- [Validation and async communication](#validation-and-async-communication)
- [Authentication](#authentication)
- [Routing](#routing)
- [External state management](#external-state-management)


### Validation and async communication

Helps you validate forms, display busy indicators, and keep track of any issues that need to be shown to the user.

#### npm packages

- [retil-operation](./packages/retil-operation)
- [retil-issues](./packages/retil-issues)

#### examples

- *TODO*


### Authentication

Easily integrate Firebase Auth into your retil-based app.

Provides a common interface for functions like `signOut()` and `signInWithPassword()`, allowing for easy use with other retil utilities.

#### npm packages

- retil-auth-firebase -- *coming soon*

#### examples

- *TODO*


### Routing

Gives you a `useRouter()` hook which makes animated route transitions easy. Works with concurrent mode, SSR, Next.js, CRA, lazily loaded components, suspense-loaded data, or anything else you might think to throw at it.

Provides helpers for `<Link>`s, redirects, 404 messages, and prefetching content for improved page load speeds. Integrates with any auth system for auth-dependent routing and redirects.

#### npm packages

- [retil-router](./packages/retil-router)
- [nextil](./packages/nextil) -- *for using retil-router with Next.js*

#### api docs

- [components](/docs/router-api.md#components)
- [hooks](/docs/router-api.md#hooks)
- [router function helpers](/docs/router-api.md#router-function-helpers)
- [functions](/docs/router-api.md#functions)
- [types](/docs/router-api.md#types)


#### examples

- [minimal](./examples/router-minimal)
- [not found boundaries](./examples/router-not-found-boundary)
- [suspense and loading indicators](./examples/router-suspense-loading-indicators)


### External state management

Helps you create, combine, transform and subscribe to suspendable state sources. Used internally by Retil's auth, history and routing packages.

Useful in situations where you need to work with one or more **external** data sources before they land in your React tree. For state originating from your UI components, you'll want to stick with React itself.

#### npm packages

- [retil-source](./packages/retil-source)

#### api docs

- *TODO*

#### examples

- *TODO*



## The Dream

I want *you* to be able to start *and launch* a web app with authentication, routing and payments **in a single weekend**. Retil is the foundation for that app. It's designed to get you started with the minimum effort possible -- both in terms of writing code, *and* learning APIs -- so that you can focus your energy on building something amazing.

Retil is one half of the project, with [Frontend Armory](https://frontarm.com) being the other. Click the link and check it out!


## License

Copyright &copy; 2020 - 2021 James K. Nelson.

Contents of the `/packages` directory are licensed under the MIT License.

Documentation, examples and website contents are licensed under a [Creative Commons Attribution-NonCommercial 4.0 International License.](https://creativecommons.org/licenses/by-nc/4.0/).
