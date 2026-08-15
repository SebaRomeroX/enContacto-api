const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')

const { errorHandler } = require('../utils/errorHandler')

function buildApp(handler) {
  const app = express()
  app.use(express.json())
  app.get('/boom', handler)
  app.use(errorHandler)
  return app
}

async function request(app, url, options) {
  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  try {
    const baseUrl = `http://localhost:${server.address().port}`
    return await fetch(`${baseUrl}${url}`, options)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

describe('errorHandler', () => {
  test('responde 500 con JSON ante un error no clasificado (#9)', async () => {
    const app = buildApp(async () => { throw new Error('boom') })
    const res = await request(app, '/boom')
    const body = await res.json()
    assert.equal(res.status, 500)
    assert.equal(body.error, 'error interno del servidor')
  })

  test('responde 400 ante un CastError de Mongoose (#9)', async () => {
    const error = new Error('id inválido')
    error.name = 'CastError'
    const app = buildApp(() => { throw error })
    const res = await request(app, '/boom')
    const body = await res.json()
    assert.equal(res.status, 400)
    assert.equal(body.error, 'id inválido')
  })

  test('responde 400 ante un ValidationError de Mongoose (#9)', async () => {
    const error = new Error('fallo validación')
    error.name = 'ValidationError'
    error.errors = {
      nombre: { message: 'campo \'nombre\' es inválido' }
    }
    const app = buildApp(() => { throw error })
    const res = await request(app, '/boom')
    const body = await res.json()
    assert.equal(res.status, 400)
    assert.equal(body.error, 'solicitud inválida')
    assert.deepEqual(body.detalles, ['campo \'nombre\' es inválido'])
  })

  test('responde 400 ante JSON malformado (#9)', async () => {
    const app = buildApp(async () => ({ ok: true }))
    const res = await request(app, '/boom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{json inválido'
    })
    const body = await res.json()
    assert.equal(res.status, 400)
    assert.equal(body.error, 'solicitud inválida')
  })

  test('no interfiere con respuestas normales (#9)', async () => {
    const app = buildApp(async (req, res) => res.json({ ok: true }))
    const res = await request(app, '/boom')
    const body = await res.json()
    assert.equal(res.status, 200)
    assert.deepEqual(body, { ok: true })
  })
})
