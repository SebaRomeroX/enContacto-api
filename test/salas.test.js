const { test, describe, after } = require('node:test')
const assert = require('node:assert/strict')

const Sala = require('../models/Sala')
const originalFindByIdAndDelete = Sala.findByIdAndDelete

const app = require('express')()
app.use('/api/salas', require('../controllers/salas'))

after(async () => {
  Sala.findByIdAndDelete = originalFindByIdAndDelete
})

describe('DELETE /api/salas/:id', () => {
  test('responde 204 por HTTP', async () => {
    Sala.findByIdAndDelete = async () => ({})

    const server = app.listen(0)
    await new Promise(resolve => server.once('listening', resolve))
    try {
      const baseUrl = `http://localhost:${server.address().port}`
      const res = await fetch(`${baseUrl}/api/salas/abc123`, { method: 'DELETE' })
      assert.equal(res.status, 204)
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })

  test('envía res.end() una sola vez (regresión del doble 204)', async () => {
    Sala.findByIdAndDelete = async () => ({})

    const router = require('../controllers/salas')
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
