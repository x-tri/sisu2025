import assert from 'node:assert/strict'
import test from 'node:test'

import { createTtlCache } from '../lib/ttl-cache'

test('reaproveita o valor dentro do TTL e recarrega depois dele', async () => {
  let clock = 0
  let loads = 0
  const cache = createTtlCache<string, number>({ ttlMs: 100, maxEntries: 10, now: () => clock })
  const load = async () => ++loads

  assert.equal(await cache.get('a', load), 1)
  clock = 99
  assert.equal(await cache.get('a', load), 1)
  clock = 100
  assert.equal(await cache.get('a', load), 2)
})

test('chamadas simultâneas compartilham uma única carga', async () => {
  let loads = 0
  const cache = createTtlCache<string, number>({ ttlMs: 100, maxEntries: 10 })
  const load = async () => ++loads

  const results = await Promise.all([cache.get('a', load), cache.get('a', load), cache.get('a', load)])
  assert.deepEqual(results, [1, 1, 1])
  assert.equal(loads, 1)
})

test('não reaproveita resultados rejeitados pelo shouldKeep nem cargas que falharam', async () => {
  let loads = 0
  const cache = createTtlCache<string, { error: string | null }>({
    ttlMs: 100,
    maxEntries: 10,
    shouldKeep: value => value.error === null,
  })

  assert.deepEqual(await cache.get('a', async () => ({ error: `falha ${++loads}` })), { error: 'falha 1' })
  assert.deepEqual(await cache.get('a', async () => ({ error: `falha ${++loads}` })), { error: 'falha 2' })

  await assert.rejects(cache.get('b', async () => { throw new Error('rede') }))
  assert.equal(cache.size, 0)
})

test('descarta a entrada mais antiga ao passar do limite', async () => {
  const cache = createTtlCache<string, string>({ ttlMs: 100, maxEntries: 2 })
  for (const key of ['a', 'b', 'c']) await cache.get(key, async () => key)

  assert.equal(cache.size, 2)
  let reloaded = false
  await cache.get('a', async () => { reloaded = true; return 'a' })
  assert.equal(reloaded, true)
})
