import textr from 'textr'
import apostrophes from 'typographic-apostrophes'
import quotes from 'typographic-quotes'
import apostrophesForPlurals from 'typographic-apostrophes-for-possessive-plurals'
import ellipses from 'typographic-ellipses'

export default textr().use(
  apostrophes,
  quotes,
  apostrophesForPlurals,
  ellipses,
  // em dashes
  (input: string) => input.replace(/--/gim, '—'),
  // en dashes,
  (input: string) => input.replace(/(\d)-(\d)/gim, '$1–$2'),
)
