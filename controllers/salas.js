const salasRouter = require('express').Router()
const Sala = require('../models/Sala')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { requireToken, requireRole } = require('../utils/auth')
const { createRateLimiter } = require('../utils/rateLimit')

const limiterSalas = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyBy: (req) => req.user?.id
})

// GET
salasRouter.get('/', requireToken, async (req, res) => {
  const salas = await Sala.find({})
  res.json(salas)
})

// POST
salasRouter.post('/', requireToken, limiterSalas, async (req, res) => {
  const { nombre } = req.body

  const validationErrors = validateRequiredStringFields(req.body, ['nombre'])
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const newSala = new Sala({
    nombre
  })

  const savedSala = await newSala.save()
  res.json(savedSala)
})

// DELETE
salasRouter.delete(
  '/:id',
  requireToken,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params

    await Sala.findByIdAndDelete(id)
    res.status(204).end()
  }
)

module.exports = salasRouter
