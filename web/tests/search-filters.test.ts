import assert from 'node:assert/strict'
import Module from 'node:module'
import test from 'node:test'

import React, { createElement } from 'react'
import { renderToString } from 'react-dom/server'

// Os componentes usam o JSX clássico, que espera React global.
;(globalThis as any).React = React

// Módulos CSS não são resolvidos fora do bundler do Next.
;(Module as any)._extensions['.css'] = (mod: any) => {
  mod.exports = new Proxy({}, { get: (_t, key) => (key === '__esModule' ? false : String(key)) })
}

test('select de Estado renderiza as 27 UFs no primeiro render, sem fetch', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('fetch não deveria ser chamado na renderização')
  })
  const { default: SearchFilters } = await import('../components/SearchFilters')
  const { ScoreProvider } = await import('../context/ScoreContext')
  const { ModalityProvider } = await import('../context/ModalityContext')

  const html = renderToString(
    createElement(ModalityProvider, null, createElement(ScoreProvider, null, createElement(SearchFilters))),
  )
  const select = html.match(/<select[^>]*>([\s\S]*?)<\/select>/)
  assert.ok(select)
  const options = select[1].match(/<option[^>]*value="[A-Z]{2}"/g) ?? []
  assert.equal(options.length, 27)
  assert.equal(fetchMock.mock.callCount(), 0)
})
