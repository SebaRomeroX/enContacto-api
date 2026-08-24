const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const Sala = require('../models/Sala')
const Mensaje = require('../models/Mensaje')
const originalFindById = Sala.findById
const originalFindByIdAndDelete = Sala.findByIdAndDelete
const originalFind = Sala.find
const originalDeleteMany = Mensaje.deleteMany

const app = require('express')()
app.use(require('express').json())
app.use('/api/salas', require('../controllers/salas'))

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(async () => {
  Sala.findById = originalFindById
  Sala.findByIdAndDelete = originalFindByIdAndDelete
  Sala.find = originalFind
  Mensaje.deleteMany = originalDeleteMany
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
    Sala.findById = async () => ({
      _id: 'abc',
      nombre: 'sala1',
      listaMiembros: [{ toString: () => 'abc' }]
    })
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

describe('PATCH /api/salas/:id', () => {
  async function patchSala(body, rol = 'admin') {
    const token = jwt.sign(
      { id: 'abc', nombre: 'pepe', rol },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
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

  test('admin renombra una sala (#28)', async () => {
    Sala.findById = async () => ({
      _id: 'abc123',
      nombre: 'vieja',
      save: async function () {
        return this
      }
    })
    const { status, body } = await patchSala({ nombre: 'nueva' })
    assert.equal(status, 200)
    assert.equal(body.nombre, 'nueva')
  })

  test('responde 400 sin nombre (#28)', async () => {
    Sala.findById = async () => ({
      _id: 'abc123',
      save: async function () {
        return this
      }
    })
    const { status, body } = await patchSala({})
    assert.equal(status, 400)
    assert.ok(body.detalles.some((d) => d.includes('nombre')))
  })

  test('responde 403 si el token no es de admin (#28)', async () => {
    Sala.findById = async () => ({
      _id: 'abc123',
      save: async function () {
        return this
      }
    })
    const { status } = await patchSala({ nombre: 'nueva' }, 'user')
    assert.equal(status, 403)
  })

  test('responde 404 si la sala no existe (#28)', async () => {
    Sala.findById = async () => null
    const { status } = await patchSala({ nombre: 'nueva' })
    assert.equal(status, 404)
  })

  test('responde 401 sin token (#28)', async () => {
    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'nueva' })
      })
      assert.equal(res.status, 401)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('DELETE /api/salas/:id', () => {
  test('responde 204 por HTTP con token de admin y borra sus mensajes (#19/#27)', async () => {
    Sala.findById = async () => ({ _id: 'abc', nombre: 'sala1' })
    Sala.findByIdAndDelete = async () => ({})
    Mensaje.deleteMany = async () => ({ deletedCount: 2 })
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

  test('responde 404 si la sala no existe (#27)', async () => {
    Sala.findById = async () => null
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
      assert.equal(res.status, 404)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 403 si el token no es de admin (#19)', async () => {
    Sala.findById = async () => ({ _id: 'abc' })
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
    Sala.findById = async () => ({ _id: 'abc', nombre: 'sala1', listaMiembros: [] })
    Sala.findByIdAndDelete = async () => ({})
    Mensaje.deleteMany = async () => ({ deletedCount: 0 })

    const router = require('../controllers/salas')
    const deleteLayer = router.stack.find(
      (layer) => layer.route && layer.route.methods.delete && layer.route.path === '/:id'
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

describe('GET /api/salas - filtrado por membresía', () => {
  test('admin ve todas las salas (#m1)', async () => {
    Sala.find = async () => [
      { _id: 's1', nombre: 'sala1', listaMiembros: [] },
      { _id: 's2', nombre: 'sala2', listaMiembros: [] }
    ]
    const token = jwt.sign(
      { id: 'a1', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.length, 2)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('usuario solo ve salas donde es miembro (#m1)', async () => {
    Sala.find = async (query) => {
      if (query.listaMiembros && query.listaMiembros.toString() === 'u1') {
        return [{ _id: 's1', nombre: 'sala1', listaMiembros: ['u1'] }]
      }
      return []
    }
    const token = jwt.sign({ id: 'u1', nombre: 'pepe' }, process.env.TOKEN_KEY)

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.length, 1)
      assert.equal(body[0].nombre, 'sala1')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('GET /api/salas/:id - control de acceso por membresía', () => {
  test('miembro puede acceder a la sala (#m2)', async () => {
    Sala.findById = async () => ({
      _id: 'abc12345678901234567890',
      nombre: 'sala1',
      listaMiembros: [{ toString: () => 'aaaaaaaaaaaaaaaaaaaaaaaa' }]
    })
    const token = jwt.sign(
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', nombre: 'pepe' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc12345678901234567890`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.nombre, 'sala1')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('no miembro recibe 403 (#m2)', async () => {
    Sala.findById = async () => ({
      _id: 'abc12345678901234567890',
      nombre: 'sala1',
      listaMiembros: [{ toString: () => '111111111111111111111111' }]
    })
    const token = jwt.sign(
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', nombre: 'pepe' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc12345678901234567890`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('admin puede acceder a cualquier sala (#m2)', async () => {
    Sala.findById = async () => ({
      _id: 'abc12345678901234567890',
      nombre: 'sala1',
      listaMiembros: []
    })
    const token = jwt.sign(
      { id: '111111111111111111111111', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc12345678901234567890`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.nombre, 'sala1')
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('POST /api/salas - con listaMiembros', () => {
  test('creador se auto-agrega como miembro (#m3)', async () => {
    let saved
    Sala.prototype.save = async function () {
      saved = this
      return this
    }
    const token = jwt.sign(
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', nombre: 'pepe' },
      process.env.TOKEN_KEY
    )

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
      assert.ok(
        saved.listaMiembros.some((id) => id.toString() === 'aaaaaaaaaaaaaaaaaaaaaaaa')
      )
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('admin puede definir listaMiembros al crear (#m3)', async () => {
    let saved
    Sala.prototype.save = async function () {
      saved = this
      return this
    }
    const token = jwt.sign(
      { id: '111111111111111111111111', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

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
        body: JSON.stringify({
          nombre: 'sala nueva',
          listaMiembros: [
            'aaaaaaaaaaaaaaaaaaaaaaaa',
            'bbbbbbbbbbbbbbbbbbbbbbbb'
          ]
        })
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(saved.listaMiembros.length, 3)
      assert.ok(saved.listaMiembros.some((id) => id.toString() === '111111111111111111111111'))
      assert.ok(saved.listaMiembros.some((id) => id.toString() === 'aaaaaaaaaaaaaaaaaaaaaaaa'))
      assert.ok(saved.listaMiembros.some((id) => id.toString() === 'bbbbbbbbbbbbbbbbbbbbbbbb'))
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('POST /api/salas/:id/miembros - agregar miembros', () => {
  test('admin agrega miembros (#m4)', async () => {
    const sala = {
      _id: 'abc12345678901234567890',
      nombre: 'sala1',
      listaMiembros: [{ toString: () => 'aaaaaaaaaaaaaaaaaaaaaaaa' }],
      save: async function () {
        return this
      }
    }
    Sala.findById = async () => sala
    const token = jwt.sign(
      { id: '111111111111111111111111', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc12345678901234567890/miembros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          usuarioIds: [
            'bbbbbbbbbbbbbbbbbbbbbbbb',
            'cccccccccccccccccccccccc'
          ]
        })
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(sala.listaMiembros.length, 3)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('no admin recibe 403 (#m4)', async () => {
    Sala.findById = async () => ({ listaMiembros: [] })
    const token = jwt.sign(
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', nombre: 'pepe' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123/miembros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ usuarioIds: ['bbbbbbbbbbbbbbbbbbbbbbbb'] })
      })
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 400 sin usuarioIds (#m4)', async () => {
    Sala.findById = async () => ({ listaMiembros: [] })
    const token = jwt.sign(
      { id: '111111111111111111111111', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123/miembros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      })
      const body = await res.json()
      assert.equal(res.status, 400)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('DELETE /api/salas/:id/miembros/:usuarioId - eliminar miembros', () => {
  test('admin elimina un miembro (#m5)', async () => {
    const sala = {
      _id: 'abc12345678901234567890',
      nombre: 'sala1',
      listaMiembros: [
        { toString: () => 'aaaaaaaaaaaaaaaaaaaaaaaa' },
        { toString: () => 'bbbbbbbbbbbbbbbbbbbbbbbb' }
      ],
      save: async function () {
        return this
      }
    }
    Sala.findById = async () => sala
    const token = jwt.sign(
      { id: '111111111111111111111111', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(
        `${baseUrl}/api/salas/abc12345678901234567890/miembros/aaaaaaaaaaaaaaaaaaaaaaaa`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(sala.listaMiembros.length, 1)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('no admin recibe 403 (#m5)', async () => {
    Sala.findById = async () => ({ listaMiembros: [] })
    const token = jwt.sign(
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', nombre: 'pepe' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(
        `${baseUrl}/api/salas/abc123/miembros/bbbbbbbbbbbbbbbbbbbbbbbb`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      assert.equal(res.status, 403)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('responde 404 si el usuario no es miembro (#m5)', async () => {
    Sala.findById = async () => ({
      listaMiembros: [{ toString: () => 'bbbbbbbbbbbbbbbbbbbbbbbb' }]
    })
    const token = jwt.sign(
      { id: '111111111111111111111111', nombre: 'admin', rol: 'admin' },
      process.env.TOKEN_KEY
    )

    const server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(
        `${baseUrl}/api/salas/abc123/miembros/aaaaaaaaaaaaaaaaaaaaaaaa`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      assert.equal(res.status, 404)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})
