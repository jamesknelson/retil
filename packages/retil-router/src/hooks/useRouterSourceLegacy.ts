/**
 * For the legacy/blocking mode hook, we can't just useSource if we want to
 * get route transitions which wait for the next route to load, because
 * useSource always immediately sets state.
 *
 * We also can't rely on any fake transitions stuff added to the legacy
 * useSource hook, as its possible that the app will use the modern useSource,
 * (as useMutableSource is available), but still won't be using concurrent mode.
 *
 * So the result is, if we want transitions without concurrent mode, we need to
 * manually manage the subscription and state here.
 */

//   const [route, setRoute] = useState<RouterSnapshot<S, Response>>(() => {
//     if (initialRoute) {
//       return initialRoute
//     } else {
//       const history = historyRef.current!
//       return Array.from(
//         generateSyncRoutes(router, history.location, {
//           basename,
//           followRedirects: true,
//           history,
//         }),
//       ).pop()!
//     }
//   })

//     const transitionCountRef = useRef(0)
//     transitionRoute = useCallback(
//       (route: RouterSnapshot<S, Response>) => {
//         if (
//           transitionTimeoutMs === 0 ||
//           !route.response.pendingSuspenses.length
//         ) {
//           setRoute(route)
//         } else {
//           // Force a refresh to pick up our transitioning request
//           setRoute((state) => ({ ...state }))

//           const transitionCount = ++transitionCountRef.current

//           Promise.race([
//             waitForMutablePromiseList(route.response.pendingSuspenses),
//             new Promise((resolve) => setTimeout(resolve, transitionTimeoutMs)),
//           ]).then(() => {
//             if (transitionCount === transitionCountRef.current) {
//               setRoute(route)
//             }
//           })
//         }
//       },
//       [transitionTimeoutMs],
//     )
//     useEffect(() => {
//       return () => {
//         transitionCountRef.current += 1
//       }
//     }, [])

//   useEffect(() => {
//     const browserHistory = getBrowserHistory(window) as History<S>
//     historyRef.current = browserHistory
//     return browserHistory.listen(({ action, location }) => {
//       if (action === 'POP') {
//         transition('pop', 'GET', () => location)
//       }
//     })
//   }, [transition, window])
