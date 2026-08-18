const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')

const {
  getTokenKey,
  getMongoDbUri,
  getPort,
  validateEnv
} = require('../utils/config')

const originalTokenKey = process.env.TOKEN_KEY
const originalMongoDbUri = process.env.MONGO_DB_URI

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
  process.env.MONGO_DB_URI = 'mongodb://localhost/test'
})

after(() => {
  if (originalTokenKey === undefined) {
    delete process.env.TOKEN_KEY
  } else {
    process.env.TOKEN_KEY = originalTokenKey
  }
  if (originalMongoDbUri === undefined) {
    delete process.env.MONGO_DB_URI
  } else {
    process.env.MONGO_DB_URI = originalMongoDbUri
  }
})

describe('utils/config', () => {
  test('getters devuelven las variables de entorno (#24)', () => {
    assert.equal(getTokenKey(), 'test-token-key')
    assert.equal(getMongoDbUri(), 'mongodb://localhost/test')
  })

  test('getPort usa el default 3001 cuando no hay PORT (#24)', () => {
    const originalPort = process.env.PORT
    delete process.env.PORT
    try {
      assert.equal(getPort(), 3001)
    } finally {
      if (originalPort !== undefined) {
        process.env.PORT = originalPort
      }
    }
  })

  test('getPort respeta la variable PORT (#24)', () => {
    const originalPort = process.env.PORT
    process.env.PORT = '4000'
    try {
      assert.equal(getPort(), '4000')
    } finally {
      if (originalPort === undefined) {
        delete process.env.PORT
      } else {
        process.env.PORT = originalPort
      }
    }
  })

  test('validateEnv no lanza cuando están todas las vars (#24)', () => {
    assert.doesNotThrow(validateEnv)
  })

  test('validateEnv lanza nombrando las vars faltantes (#24)', () => {
    delete process.env.TOKEN_KEY
    delete process.env.MONGO_DB_URI
    assert.throws(validateEnv, /TOKEN_KEY/)
    assert.throws(validateEnv, /MONGO_DB_URI/)
  })
})
