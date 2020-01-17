module.exports = {
  modulePaths: ['<rootDir>/src/'],
  modulePathIgnorePatterns: ['<rootDir>/demo/'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
}
