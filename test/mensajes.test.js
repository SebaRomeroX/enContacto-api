const { test, describe, after } = require('node:test')
const assert = require('node:assert/strict')

const Mensaje = require('../models/Mensaje')
const originalFindByIdAndDelete = Mensaje.findByIdAndDelete

const app = require('express')()
app.use('/api/mensajes', require('../controllers/mensajes'))

after(async () => {
  Mensaje.findByIdAndDelete = originalFindByIdAndDelete
})

describe('DELETE /api/mensajes/:id', () => {
  test('responde 204 por HTTP', async () => {
    Mensaje.findByIdAndDelete = async () => ({})

    const server = app.listen(0)
    await new Promise(resolve => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/mensajes/abc123`, { method: 'DELETE' })
      assert.equal(res.status, 204)
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('envía res.end() una sola vez (regresión del doble 204)', async () => {
    Mensaje.findByIdAndDelete = async () => ({})

    const router = require('../controllers/mensajes')
    const deleteLayer = router.stack.find(layer => layer.route && layer.route.methods.delete)
    const handler = deleteLayer.route.stack[0].handle

    const res = {
      ends: 0,
      status () { return this },
      end () { this.ends++ }
    }

    await handler({ params: { id: 'abc123' } }, res)
    await new Promise(resolve => setImmediate(resolve))

    assert.equal(res.ends, 1)
  })
})
