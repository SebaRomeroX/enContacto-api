const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const { requireToken } = require('../utils/auth')

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(() => {
  delete process.env.TOKEN_KEY
})

function callMiddleware(authorization) {
  const req = {
    user: undefined,
    get(header) {
      return header === 'authorization' ? authorization : undefined
    }
  }
  let statusCode = null
  let sentBody = null
  let nextCalled = false

  const res = {
    status(code) {
      statusCode = code
      return this
    },
    json(body) {
      sentBody = body
    }
  }
  const next = () => { nextCalled = true }

  requireToken(req, res, next)

  return { statusCode, sentBody, nextCalled, req }
}

describe('requireToken', () => {
  test('devuelve 401 si falta el header Authorization', () => {
    const { statusCode, sentBody, nextCalled } = callMiddleware(undefined)
    assert.equal(statusCode, 401)
    assert.equal(sentBody.error, 'token no válido')
    assert.equal(nextCalled, false)
  })

  test('devuelve 401 si el header no es Bearer', () => {
    const { statusCode, nextCalled } = callMiddleware('Basic abc')
    assert.equal(statusCode, 401)
    assert.equal(nextCalled, false)
  })

  test('devuelve 401 si el token es inválido', () => {
    const { statusCode, nextCalled } = callMiddleware('Bearer token-invalido')
    assert.equal(statusCode, 401)
    assert.equal(nextCalled, false)
  })

  test('llama a next() y puebla req.user con un token válido', () => {
    const payload = { id: 'user1', nombre: 'pepe' }
    const token = jwt.sign(payload, process.env.TOKEN_KEY)
    const { statusCode, nextCalled, req } = callMiddleware(`Bearer ${token}`)
    assert.equal(statusCode, null)
    assert.equal(nextCalled, true)
    assert.equal(req.user.id, 'user1')
    assert.equal(req.user.nombre, 'pepe')
  })
})