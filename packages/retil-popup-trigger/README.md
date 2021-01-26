# retil-popup-trigger

**A utility for triggering and closing popups.**

Works great for tooltips, popup menus, dropdown selects, etc.

Available in two flavors:

- [React Hook](#react-hook)
- [Vanilla JS](#vanilla-js)


How it works
------------

Say you have a trigger element, and a popup.

```html
<button>Trigger</button>
<div>Popup</div>
```

You only want the popup to appear if the trigger is focused or selected -- *or* when the popup itself has focus.

This utility handles this for you by adding events to the trigger and popup nodes, and exposing an `active` variable which you can use to switch the popup's visibility:

```jsx
<button ref={trigger.ref}>Trigger</button>
{
  trigger.active &&
  <div ref={trigger.popupRef}>
    Popup
  </div>
}
```


React Hook
----------

The simplest way to use this tool is with a React hook.

```jsx
import { usePopupTrigger } from 'retil-popup-trigger'

function MyComponent() {
  let trigger = usePopupTrigger({
    triggerOnFocus: true,
    triggerOnHover: true,
    triggerOnSelect: true, // Pop on touch/click the trigger, or
                           // on enter/space while focused.
  })

  return (
    <>
      <button ref={trigger.ref}>Trigger!</button>
      {
        trigger.active &&
        <div ref={trigger.popupRef}>
          <a href="https://frontarm.com"></a>
        </div>
      }
    </>
  )
}
```

Combine with [react-popper](http://npmjs.com/package/react-popper) and [portals](https://reactjs.org/docs/portals.html) for all your popup needs!


Vanilla JS
----------

Internally, everything is contained within a vanilla JavaScript class.

```js
import { PopupTrigger } from 'popup-trigger'

let trigger = new PopupTrigger({
  triggerOnFocus: true,
  triggerOnHover: true,
  triggerOnSelect: true, // Pop on touch/click the trigger, or
                          // on enter/space while focused.
})

trigger.setTriggerNode(/* ... */)
trigger.setPopupNode(/* ... */)

trigger.getState() // { active, focused, hovering, selected }
trigger.subscribe(({ active, focused, hovering, selected ) => {})
trigger.dispose() // Clean up afterwards

trigger.close() // Close the popup imperatively
```
