import assert from 'node:assert/strict'
import Module from 'node:module'
import test from 'node:test'

import React, { createElement } from 'react'
import { renderToString } from 'react-dom/server'

;(globalThis as any).React = React

// Módulos CSS não são resolvidos fora do bundler do Next.
;(Module as any)._extensions['.css'] = (mod: any) => {
  mod.exports = new Proxy({}, { get: (_t, key) => (key === '__esModule' ? false : String(key)) })
}

test('Home renderiza o select de Estado com as 27 UFs sem esperar fetch', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('fetch não deveria ser chamado na renderização')
  })
  const { default: Home } = await import('../app/page')
  const { ScoreProvider } = await import('../context/ScoreContext')
  const { ModalityProvider } = await import('../context/ModalityContext')

  const html = renderToString(
    createElement(ModalityProvider, null, createElement(ScoreProvider, null, createElement(Home))),
  )
  const select = html.match(/<select[^>]*id="state-filter"[^>]*>([\s\S]*?)<\/select>/)
  assert.ok(select, 'select de Estado ausente')
  const options = select[1].match(/<option[^>]*value="[A-Z]{2}"/g) ?? []
  assert.equal(options.length, 27)
  assert.equal(fetchMock.mock.callCount(), 0)
})
