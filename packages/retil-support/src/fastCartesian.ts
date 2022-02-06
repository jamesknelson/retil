/*
   Copyright 2021 ehmicky <ehmicky@gmail.com>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

// This function is available NPM under the "fast-cartesian" package, but is
// only available in a Common JS build that cannot be tree-shaken out.
// https://www.npmjs.com/package/fast-cartesian

// Does a cartesian product on several arrays.
// Returns an array with the results.
// Optimized to be the fastest implementation in JavaScript.
export function fastCartesian<TFactors extends any[][]>(
  arrays: [...TFactors],
): TFactors extends []
  ? []
  : {
      [TFactor in keyof TFactors]: TFactors[TFactor] extends Array<
        infer TUnArrayed
      >
        ? TUnArrayed
        : never
    }[]
export function fastCartesian(arrays: unknown[]) {
  if (arrays.length === 0) {
    return []
  }

  const loopFunc = getLoopFunc(arrays.length)
  const result: unknown[] = []
  loopFunc(arrays, result)
  return result
}

const getLoopFunc = function (length: number) {
  const cachedLoopFunc = cache[length]

  if (cachedLoopFunc !== undefined) {
    return cachedLoopFunc
  }

  const loopFunc = mGetLoopFunc(length)
  cache[length] = loopFunc
  return loopFunc
}

const cache: { [length: number]: Function } = {}

// Create a function with `new Function()` that does:
//   function(arrays, results) {
//     for (const value0 of arrays[0]) {
//       for (const value1 of arrays[1]) {
//         // and so on
//         results.push([value0, value1])
//       }
//     }
//   }
const mGetLoopFunc = function (length: number) {
  const indexes = Array.from({ length }, getIndex)
  const start = indexes
    .map((index) => `for (const value${index} of arrays[${index}]) {`)
    .join('\n')
  const middle = indexes.map((index) => `value${index}`).join(', ')
  const end = '}\n'.repeat(length)

  // eslint-disable-next-line no-new-func
  return new Function(
    'arrays',
    'result',
    `${start}\nresult.push([${middle}])\n${end}`,
  )
}

const getIndex = function (_value: unknown, index: number) {
  return String(index)
}
