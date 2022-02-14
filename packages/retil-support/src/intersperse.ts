export const intersperse = <T>(separator: (n: number) => T, arr: T[]): T[] =>
  arr.reduce<T[]>((acc, currentElement, currentIndex) => {
    const isLast = currentIndex === arr.length - 1
    return [
      ...acc,
      currentElement,
      ...(isLast ? [] : [separator(currentIndex)]),
    ]
  }, [])
