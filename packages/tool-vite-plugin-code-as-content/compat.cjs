async function getCodeAsContentPlugins(options) {
  const { getCodeAsContentPlugins } = await import('./dist/index.js')
  return getCodeAsContentPlugins(options)
}

async function registerRefractorLanguages(...languageNames) {
  const { registerRefractorLanguages } = await import('./dist/index.js')
  return registerRefractorLanguages(languageNames)
}

module.exports = {
  getCodeAsContentPlugins,
  registerRefractorLanguages,
}
