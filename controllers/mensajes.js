const mensajesRouter = require('express').Router()
const Mensaje = require('../models/Mensaje')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { requireToken, requireRole } = require('../utils/auth')
const { createRateLimiter } = require('../utils/rateLimit')

const limiterMensajes = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyBy: (req) => req.user?.id
})

// GET
mensajesRouter.get('/', requireToken, async (req, res) => {
  const mensajes = await Mensaje.find({})
    .populate('usuarioId', 'nombre foto')
    .populate('salaId', 'nombre')
  res.json(mensajes)
})

// POST
mensajesRouter.post('/', requireToken, limiterMensajes, async (req, res) => {
  const { mensaje, usuarioId, salaId } = req.body

  const validationErrors = validateRequiredStringFields(req.body, [
    'mensaje',
    'usuarioId',
    'salaId'
  ])
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const newMensaje = new Mensaje({
    mensaje,
    date: new Date(),
    usuarioId,
    salaId
  })

  const savedMensaje = await newMensaje.save()
  res.json(savedMensaje)
})

// DELETE
mensajesRouter.delete(
  '/:id',
  requireToken,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params

    await Mensaje.findByIdAndDelete(id)
    res.status(204).end()
  }
)

module.exports = mensajesRouter
