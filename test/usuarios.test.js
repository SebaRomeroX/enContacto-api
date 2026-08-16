const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const originalFindByIdAndDelete = Usuario.findByIdAndDelete
const originalFindById = Usuario.findById
const originalFind = Usuario.find
const originalSave = Usuario.prototype.save
const originalHash = bcrypt.hash

const app = require('express')()
app.use(require('express').json())
app.use('/api/usuarios', require('../controllers/usuarios'))

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(async () => {
  Usuario.findByIdAndDelete = originalFindByIdAndDelete
  Usuario.findById = originalFindById
  Usuario.find = originalFind
  Usuario.prototype.save = originalSave
  bcrypt.hash = originalHash
  delete process.env.TOKEN_KEY
})

describe('GET /api/usuarios', () => {
  test('no expone el campo "contra" en la respuesta (#6)', async () => {
    Usuario.find = async () => [
      new Usuario({
        _id: 'abc',
        nombre: 'pepe',
        contra: 'hash-secreto',
        rol: 'user'
      })
    ]
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()

      assert.equal(res.status, 200)
      assert.equal(body.length, 1)
      assert.equal(body[0].nombre, 'pepe')
      assert.equal(body[0].contra, undefined)
      assert.equal(JSON.stringify(body).includes('hash-secreto'), false)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#19b)', async () => {
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios`)
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('POST /api/usuarios', () => {
  async function postUsuario(body, rol = 'user') {
    const token = jwt.sign(
      { id: 'abc', nombre: 'admin', rol },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      const resBody = await res.json().catch(() => ({}))
      return { status: res.status, body: resBody }
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  }

  test('responde 400 si intenta crear una cuenta admin (#19)', async () => {
    const { status, body } = await postUsuario(
      { nombre: 'otro', contra: 'secreto', rol: 'admin' },
      'admin'
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('admin')))
  })

  test('responde 400 con un rol fuera de la lista permitida', async () => {
    const { status, body } = await postUsuario(
      { nombre: 'otro', contra: 'secreto', rol: 'super' },
      'admin'
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('rol')))
  })

  test('crea usuario con rol "mod"', async () => {
    Usuario.prototype.save = async function () {
      return this
    }
    bcrypt.hash = async () => 'hash'

    const { status, body } = await postUsuario(
      { nombre: 'otro', contra: 'secreto', rol: 'mod' },
      'admin'
    )
    assert.equal(status, 200)
    assert.equal(body.rol, 'mod')
  })

  test('asigna rol "user" por defecto', async () => {
    Usuario.prototype.save = async function () {
      return this
    }
    bcrypt.hash = async () => 'hash'

    const { status, body } = await postUsuario({
      nombre: 'otro',
      contra: 'secreto'
    })
    assert.equal(status, 200)
    assert.equal(body.rol, 'user')
  })
})

describe('DELETE /api/usuarios/:id', () => {
  test('responde 204 por HTTP con token de admin (#19)', async () => {
    Usuario.findById = async () => ({ rol: 'user' })
    Usuario.findByIdAndDelete = async () => ({})
    const token = jwt.sign(
      { id: 'abc', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 204)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 401 sin token (#5)', async () => {
    Usuario.findById = async () => ({ rol: 'user' })
    Usuario.findByIdAndDelete = async () => ({})

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'DELETE'
      })
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 403 si el token no es de admin (#19)', async () => {
    Usuario.findById = async () => ({ rol: 'user' })
    const token = jwt.sign(
      { id: 'abc', nombre: 'pepe', rol: 'user' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 403 si intenta eliminar la cuenta admin (#19)', async () => {
    Usuario.findById = async () => ({ rol: 'admin' })
    const token = jwt.sign(
      { id: 'abc', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 404 si el usuario no existe (#19)', async () => {
    Usuario.findById = async () => null
    const token = jwt.sign(
      { id: 'abc', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 404)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('envía res.end() una sola vez (regresión del doble 204)', async () => {
    Usuario.findById = async () => ({ rol: 'user' })
    Usuario.findByIdAndDelete = async () => ({})

    const router = require('../controllers/usuarios')
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
