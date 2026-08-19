const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const Sala = require('../models/Sala')
const originalFindById = Sala.findById
const originalFindByIdAndDelete = Sala.findByIdAndDelete

const app = require('express')()
app.use(require('express').json())
app.use('/api/salas', require('../controllers/salas'))

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(async () => {
  Sala.findById = originalFindById
  Sala.findByIdAndDelete = originalFindByIdAndDelete
  delete process.env.TOKEN_KEY
})

describe('GET /api/salas', () => {
  test('responde 200 con token válido (#19b)', async () => {
    Sala.find = async () => [{ _id: 'abc', nombre: 'sala1' }]
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body[0].nombre, 'sala1')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#19b)', async () => {
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas`)
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('GET /api/salas/:id', () => {
  test('responde 200 con token válido (#26)', async () => {
    Sala.findById = async () => ({ _id: 'abc', nombre: 'sala1' })
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.nombre, 'sala1')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 404 si no existe (#26)', async () => {
    Sala.findById = async () => null
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 404)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#19b)', async () => {
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`)
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('POST /api/salas', () => {
  test('crea sala con token válido (#21)', async () => {
    Sala.prototype.save = async function () {
      return this
    }
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: 'sala nueva' })
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.nombre, 'sala nueva')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 429 al exceder el límite de POSTs (#21)', async () => {
    Sala.prototype.save = async function () {
      return this
    }
    const token = jwt.sign(
      { id: 'rl-user', nombre: 'spammer' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: 'sala nueva' })
      }

      let last
      for (let i = 0; i < 11; i++) {
        last = await fetch(`${baseUrl}/api/salas`, options)
      }
      const body = await last.json()
      assert.equal(last.status, 429)
      assert.equal(body.error, 'demasiados intentos, intente más tarde')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('DELETE /api/salas/:id', () => {
  test('responde 204 por HTTP con token de admin (#19)', async () => {
    Sala.findByIdAndDelete = async () => ({})
    const token = jwt.sign(
      { id: 'abc', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 204)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 403 si el token no es de admin (#19)', async () => {
    Sala.findByIdAndDelete = async () => ({})
    const token = jwt.sign(
      { id: 'abc', nombre: 'pepe', rol: 'user' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#5)', async () => {
    Sala.findByIdAndDelete = async () => ({})

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
        method: 'DELETE'
      })
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('envía res.end() una sola vez (regresión del doble 204)', async () => {
    Sala.findByIdAndDelete = async () => ({})

    const router = require('../controllers/salas')
    const deleteLayer = router.stack.find(
      (layer) => layer.route && layer.route.methods.delete
    )
    const handler =
      deleteLayer.route.stack[deleteLayer.route.stack.length - 1].handle

    const res = {
      ends: 0,
      status() {
        return this
      },
      end() {
        this.ends++
      }
    }

    await handler({ params: { id: 'abc123' } }, res)
    await new Promise((resolve) => setImmediate(resolve))

    assert.equal(res.ends, 1)
  })
})
