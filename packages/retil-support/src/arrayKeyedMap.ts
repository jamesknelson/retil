// Based on https://github.com/anko/array-keyed-map/blob/fcae99f3196d95d6e576aceb349db11ef1f617e8/main.js

import { Maybe } from './maybe'

const dataSymbol = Symbol('data')

type MapNode<K extends unknown[], V> = Map<
  K[number] | typeof dataSymbol,
  MapNode<K, V> | V
>

export class ArrayKeyedMap<K extends unknown[], V> {
  _root: MapNode<K, V>
  _size: number

  constructor(initialEntries: [K, V][] = []) {
    this._root = new Map()
    this._size = 0
    for (const [k, v] of initialEntries) {
      this.set(k, v)
    }
  }

  set(path: K, value: V): this {
    let map = this._root
    for (const item of path) {
      let nextMap = map.get(item) as undefined | MapNode<K, V>
      if (!nextMap) {
        // Create next map if none exists
        nextMap = new Map()
        map.set(item, nextMap)
      }
      map = nextMap
    }

    // Reached end of path.  Set the data symbol to the given value, and
    // increment size if nothing was here before.
    if (!map.has(dataSymbol)) this._size += 1
    map.set(dataSymbol, value)
    return this
  }

  has(path: K) {
    let map = this._root
    for (const item of path) {
      const nextMap = map.get(item) as undefined | MapNode<K, V>
      if (nextMap) {
        map = nextMap
      } else {
        return false
      }
    }
    return map.has(dataSymbol)
  }

  // Instead of standard `get`, provide a `getMaybe` which give information on
  // inclusion and value in the one call, so that redundant work can be
  // prevented due to claling `has()` before `get()`.
  getMaybe(path: K): Maybe<V> {
    let map = this._root
    for (const item of path) {
      map = map.get(item) as MapNode<K, V>
      if (!map) return []
    }
    return [map.get(dataSymbol)] as [V]
  }

  delete(path: K) {
    let map = this._root

    // Maintain a stack of maps we visited, so we can go back and trim empty ones
    // if we delete something.
    const stack = []

    for (const item of path) {
      const nextMap = map.get(item) as undefined | MapNode<K, V>
      if (nextMap) {
        stack.unshift({ parent: map, child: nextMap, item })
        map = nextMap
      } else {
        // Nothing to delete
        return false
      }
    }

    // Reached end of path.  Delete data, if it exists.
    const hadPreviousValue = map.delete(dataSymbol)

    // If something was deleted, decrement size and go through the stack of
    // visited maps, trimming any that are now empty.
    if (hadPreviousValue) {
      this._size -= 1

      for (const { parent, child, item } of stack) {
        if (child.size === 0) {
          parent.delete(item)
        }
      }
    }
    return hadPreviousValue
  }

  get size() {
    return this._size
  }

  clear() {
    this._root.clear()
    this._size = 0
  }
}
