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
const originalCompare = bcrypt.compare

const app = require('express')()
app.use(require('express').json())
app.use('/api/usuarios', require('../controllers/usuarios'))
app.use(require('../utils/errorHandler').errorHandler)

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(async () => {
  Usuario.findByIdAndDelete = originalFindByIdAndDelete
  Usuario.findById = originalFindById
  Usuario.find = originalFind
  Usuario.prototype.save = originalSave
  bcrypt.hash = originalHash
  bcrypt.compare = originalCompare
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

describe('GET /api/usuarios/:id', () => {
  test('responde 200 con token válido y no expone "contra" (#26)', async () => {
    Usuario.findById = async () =>
      new Usuario({
        _id: 'abc',
        nombre: 'pepe',
        contra: 'hash-secreto',
        rol: 'user'
      })
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.nombre, 'pepe')
      assert.equal(body.contra, undefined)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 404 si no existe (#26)', async () => {
    Usuario.findById = async () => null
    const token = jwt.sign({ id: 'abc', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
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
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`)
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

  test('responde 400 si el nombre ya está en uso (#20)', async () => {
    Usuario.prototype.save = async () => {
      const error = new Error('E11000 duplicate key')
      error.code = 11000
      error.keyPattern = { nombre: 1 }
      throw error
    }

    const { status, body } = await postUsuario(
      { nombre: 'pepe', contra: 'secreto' },
      'admin'
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('nombre')))
  })

  test('responde 400 si la contraseña tiene menos de 6 caracteres (#20)', async () => {
    const { status, body } = await postUsuario(
      { nombre: 'otro', contra: 'corta' },
      'admin'
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('contra')))
  })

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

  test('responde 429 al exceder el límite de POSTs (#21)', async () => {
    Usuario.prototype.save = async function () {
      return this
    }
    bcrypt.hash = async () => 'hash'
    const token = jwt.sign(
      { id: 'rl-user', nombre: 'spammer', rol: 'user' },
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
        body: JSON.stringify({ nombre: 'otro', contra: 'secreto' })
      }

      let last
      for (let i = 0; i < 11; i++) {
        last = await fetch(`${baseUrl}/api/usuarios`, options)
      }
      const body = await last.json()
      assert.equal(last.status, 429)
      assert.equal(body.error, 'demasiados intentos, intente más tarde')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('429 solo bloquea al usuario que excede el límite (#21)', async () => {
    Usuario.prototype.save = async function () {
      return this
    }
    bcrypt.hash = async () => 'hash'

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const options = (userId) => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt.sign(
            { id: userId, nombre: 'x', rol: 'user' },
            process.env.TOKEN_KEY
          )}`
        },
        body: JSON.stringify({ nombre: 'otro', contra: 'secreto' })
      })

      let last
      for (let i = 0; i < 11; i++) {
        last = await fetch(`${baseUrl}/api/usuarios`, options('rl-user'))
      }
      assert.equal(last.status, 429)

      const res = await fetch(`${baseUrl}/api/usuarios`, options('otro-user'))
      assert.equal(res.status, 200)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('PATCH /api/usuarios/:id', () => {
  function stubTarget(overrides = {}) {
    Usuario.findById = async () => ({
      _id: 'abc123',
      nombre: 'pepe',
      contra: 'hash-viejo',
      rol: 'user',
      save: async function () {
        return this
      },
      ...overrides
    })
  }

  async function patchUsuario(body, payload) {
    const token = jwt.sign(payload, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'PATCH',
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

  test('el propio usuario actualiza su foto (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { foto: 'nueva.png' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 200)
    assert.equal(body.foto, 'nueva.png')
  })

  test('el propio usuario cambia su contra con contraActual correcta (#28)', async () => {
    stubTarget()
    bcrypt.compare = async () => true
    let hashedValue
    bcrypt.hash = async (value) => {
      hashedValue = value
      return 'hash-nuevo'
    }
    const { status } = await patchUsuario(
      { contra: 'nueva123', contraActual: 'vieja' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 200)
    assert.equal(hashedValue, 'nueva123')
  })

  test('responde 400 si contraActual no coincide (#28)', async () => {
    stubTarget()
    bcrypt.compare = async () => false
    const { status, body } = await patchUsuario(
      { contra: 'nueva123', contraActual: 'incorrecta' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('contraActual')))
  })

  test('responde 400 si la nueva contra tiene menos de 6 caracteres (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { contra: 'corta', contraActual: 'vieja' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('contra')))
  })

  test('responde 400 si falta contraActual al cambiar contra (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { contra: 'nueva123' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('contraActual')))
  })

  test('responde 400 si intenta modificar el nombre (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { nombre: 'otro' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('nombre')))
  })

  test('responde 400 si el propio usuario intenta cambiar su rol (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { rol: 'mod' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('rol')))
  })

  test('responde 403 si un usuario no-admin edita a otro (#28)', async () => {
    stubTarget()
    const { status } = await patchUsuario(
      { foto: 'x.png' },
      { id: 'otro', nombre: 'lucas', rol: 'user' }
    )
    assert.equal(status, 403)
  })

  test('admin cambia el rol de un usuario a "mod" (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { rol: 'mod' },
      { id: 'admin', nombre: 'admin', rol: 'admin' }
    )
    assert.equal(status, 200)
    assert.equal(body.rol, 'mod')
  })

  test('responde 400 si admin cambia un rol a "admin" (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { rol: 'admin' },
      { id: 'admin', nombre: 'admin', rol: 'admin' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('rol')))
  })

  test('responde 403 si admin intenta modificar la cuenta admin (#28)', async () => {
    stubTarget({ rol: 'admin' })
    const { status } = await patchUsuario(
      { rol: 'user' },
      { id: 'admin', nombre: 'admin', rol: 'admin' }
    )
    assert.equal(status, 403)
  })

  test('responde 400 si admin edita foto/contra de otro usuario (#28)', async () => {
    stubTarget()
    const { status, body } = await patchUsuario(
      { foto: 'x.png' },
      { id: 'admin', nombre: 'admin', rol: 'admin' }
    )
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('propio usuario')))
  })

  test('responde 404 si el usuario no existe (#28)', async () => {
    Usuario.findById = async () => null
    const { status } = await patchUsuario(
      { foto: 'x.png' },
      { id: 'abc123', nombre: 'pepe', rol: 'user' }
    )
    assert.equal(status, 404)
  })

  test('responde 401 sin token (#28)', async () => {
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/usuarios/abc123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: 'x.png' })
      })
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
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
