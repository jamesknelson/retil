To get the best loading speeds, data should only be loaded once it's actually
needed. And to facilitate this, we've split the data into following format:

- `index` files which include a list of available files and their metadata
- `content` files which export a function that'll take a slug, and return
  a promise to the full content for the page if it exists – or null if it
  doesn't.