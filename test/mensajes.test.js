const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const Mensaje = require('../models/Mensaje')
const originalFind = Mensaje.find
const originalFindById = Mensaje.findById
const originalFindByIdAndDelete = Mensaje.findByIdAndDelete
const originalCountDocuments = Mensaje.countDocuments
const originalSave = Mensaje.prototype.save

const app = require('express')()
app.use(require('express').json())
app.use('/api/mensajes', require('../controllers/mensajes'))

function mensajesQueryStub(result) {
  return {
    sort() {
      return this
    },
    skip() {
      return this
    },
    limit() {
      return this
    },
    populate() {
      return this
    },
    then(resolve) {
      resolve(result)
    }
  }
}

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(async () => {
  Mensaje.find = originalFind
  Mensaje.findById = originalFindById
  Mensaje.findByIdAndDelete = originalFindByIdAndDelete
  Mensaje.countDocuments = originalCountDocuments
  Mensaje.prototype.save = originalSave
  delete process.env.TOKEN_KEY
})

describe('GET /api/mensajes', () => {
  test('responde 200 con token válido y X-Total-Count (#19b/#26)', async () => {
    Mensaje.countDocuments = async () => 3
    Mensaje.find = () => mensajesQueryStub([{ _id: 'abc', mensaje: 'hola' }])
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body[0].mensaje, 'hola')
      assert.equal(res.headers.get('X-Total-Count'), '3')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 400 con salaId inválido (#26)', async () => {
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes?salaId=no-valido`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 400)
      assert.ok(body.detalles.some((d) => d.includes('salaId')))
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 400 con fecha "desde" inválida (#26)', async () => {
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes?desde=no-es-fecha`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 400)
      assert.ok(body.detalles.some((d) => d.includes('desde')))
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 400 con "hasta" anterior a "desde" no validado pero fecha inválida (#26)', async () => {
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes?hasta=no-es-fecha`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 400)
      assert.ok(body.detalles.some((d) => d.includes('hasta')))
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 400 con limit no numérico (#26)', async () => {
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes?limit=abc`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 400)
      assert.ok(body.detalles.some((d) => d.includes('limit')))
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 400 con limit mayor al máximo (#26)', async () => {
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes?limit=101`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 400)
      assert.ok(body.detalles.some((d) => d.includes('100')))
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#19b)', async () => {
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes`)
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('GET /api/mensajes/:id', () => {
  test('responde 200 con token válido (#26)', async () => {
    Mensaje.findById = () => mensajesQueryStub({ _id: 'abc', mensaje: 'hola' })
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.mensaje, 'hola')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 404 si no existe (#26)', async () => {
    Mensaje.findById = () => mensajesQueryStub(null)
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`, {
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
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`)
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('POST /api/mensajes', () => {
  test('crea mensaje con token válido (#21)', async () => {
    Mensaje.prototype.save = async function () {
      return this
    }
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mensaje: 'hola',
          usuarioId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          salaId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
        })
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.mensaje, 'hola')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 429 al exceder el límite de POSTs (#21)', async () => {
    Mensaje.prototype.save = async function () {
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
        body: JSON.stringify({
          mensaje: 'hola',
          usuarioId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          salaId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
        })
      }

      let last
      for (let i = 0; i < 31; i++) {
        last = await fetch(`${baseUrl}/api/mensajes`, options)
      }
      const body = await last.json()
      assert.equal(last.status, 429)
      assert.equal(body.error, 'demasiados intentos, intente más tarde')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('DELETE /api/mensajes/:id', () => {
  test('responde 204 por HTTP con token de admin (#19)', async () => {
    Mensaje.findByIdAndDelete = async () => ({})
    const token = jwt.sign(
      { id: 'abc', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 204)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 403 si el token no es de admin (#19)', async () => {
    Mensaje.findByIdAndDelete = async () => ({})
    const token = jwt.sign(
      { id: 'abc', nombre: 'pepe', rol: 'user' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#5)', async () => {
    Mensaje.findByIdAndDelete = async () => ({})

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`, {
        method: 'DELETE'
      })
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('envía res.end() una sola vez (regresión del doble 204)', async () => {
    Mensaje.findByIdAndDelete = async () => ({})

    const router = require('../controllers/mensajes')
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
