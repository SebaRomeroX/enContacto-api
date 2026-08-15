const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')

const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const originalFindOne = Usuario.findOne
const originalCompare = bcrypt.compare
const originalSign = jwt.sign

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/login', require('../controllers/login'))
  return app
}

async function startServer(app) {
  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const baseUrl = `http://localhost:${server.address().port}`
  return { server, baseUrl }
}

beforeEach(() => {
  process.env.TOKEN_KEY = 'test-token-key'
})

after(async () => {
  Usuario.findOne = originalFindOne
  bcrypt.compare = originalCompare
  jwt.sign = originalSign
})

describe('POST /api/login', () => {
  test('responde 400 cuando faltan nombre y contra (validación #8)', async () => {
    Usuario.findOne = async () => ({})

    const { server, baseUrl } = await startServer(buildApp())
    try {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const body = await res.json()
      assert.equal(res.status, 400)
      assert.equal(body.error, 'solicitud inválida')
      assert.ok(body.detalles.some(d => d.includes('nombre')))
      assert.ok(body.detalles.some(d => d.includes('contra')))
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('responde 401 sin crashear cuando el usuario no existe (#4)', async () => {
    Usuario.findOne = async () => null
    bcrypt.compare = originalCompare

    const { server, baseUrl } = await startServer(buildApp())
    try {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'ghost', contra: 'secreto' })
      })
      const body = await res.json()
      assert.equal(res.status, 401)
      assert.deepEqual(body, { error: 'datos incorrectos' })
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('responde 401 con contraseña incorrecta (#4)', async () => {
    Usuario.findOne = async () => ({ _id: 'id', nombre: 'pepe', contra: 'hash' })
    bcrypt.compare = async () => false

    const { server, baseUrl } = await startServer(buildApp())
    try {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'pepe', contra: 'mala' })
      })
      const body = await res.json()
      assert.equal(res.status, 401)
      assert.deepEqual(body, { error: 'datos incorrectos' })
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('responde 200 con token al enviar credenciales correctas', async () => {
    Usuario.findOne = async () => ({ _id: 'abc', nombre: 'pepe', contra: 'hash' })
    bcrypt.compare = async () => true
    jwt.sign = () => 'token-de-prueba'

    const { server, baseUrl } = await startServer(buildApp())
    try {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'pepe', contra: 'buena' })
      })
      const body = await res.json()
      assert.equal(res.status, 200)
      assert.equal(body.nombre, 'pepe')
      assert.equal(body.token, 'token-de-prueba')
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('responde 429 al exceder el límite de intentos (#7)', async () => {
    Usuario.findOne = async () => ({ _id: 'id', nombre: 'pepe', contra: 'hash' })
    bcrypt.compare = async () => false

    const { server, baseUrl } = await startServer(buildApp())
    try {
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'pepe', contra: 'mala' })
      }

      let last
      for (let i = 0; i < 11; i++) {
        last = await fetch(`${baseUrl}/api/login`, options)
      }
      const body = await last.json()
      assert.equal(last.status, 429)
      assert.equal(body.error, 'demasiados intentos, intente más tarde')
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('429 solo afecta a la IP que excede el límite (#7)', async () => {
    Usuario.findOne = async () => ({ _id: 'id', nombre: 'pepe', contra: 'hash' })
    bcrypt.compare = async () => false

    const { server, baseUrl } = await startServer(buildApp())
    try {
      const options = (ip) => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ nombre: 'pepe', contra: 'mala' })
      })

      let last
      for (let i = 0; i < 11; i++) {
        last = await fetch(`${baseUrl}/api/login`, options('203.0.113.1'))
      }
      const blocked = await last.json()
      assert.equal(last.status, 429)

      const res = await fetch(`${baseUrl}/api/login`, options('203.0.113.2'))
      assert.equal(res.status, 401)
      assert.deepEqual(await res.json(), { error: 'datos incorrectos' })
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })
})