const { Types } = require('mongoose')
const mensajesRouter = require('express').Router()
const Mensaje = require('../models/Mensaje')
const Usuario = require('../models/Usuario')
const Sala = require('../models/Sala')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { requireToken, requireRole } = require('../utils/auth')
const { createRateLimiter } = require('../utils/rateLimit')

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const limiterMensajes = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyBy: (req) => req.user?.id
})

function parsePagination(query) {
  const { limit = DEFAULT_LIMIT, offset = 0 } = query
  if (!/^\d+$/.test(String(limit)) || !/^\d+$/.test(String(offset))) {
    return {
      error: "los parámetros 'limit' y 'offset' deben ser números enteros"
    }
  }
  const parsedLimit = Number(limit)
  if (parsedLimit < 1) {
    return { error: "el parámetro 'limit' debe ser mayor a 0" }
  }
  if (parsedLimit > MAX_LIMIT) {
    return { error: `el parámetro 'limit' no puede superar ${MAX_LIMIT}` }
  }
  return { limit: parsedLimit, offset: Number(offset) }
}

function parseMensajeQuery(query) {
  const filter = {}
  const { salaId, desde, hasta } = query

  if (salaId !== undefined) {
    if (!Types.ObjectId.isValid(String(salaId))) {
      return { error: "el parámetro 'salaId' no es un id válido" }
    }
    filter.salaId = salaId
  }

  if (desde !== undefined) {
    const date = new Date(desde)
    if (Number.isNaN(date.getTime())) {
      return { error: "el parámetro 'desde' no es una fecha válida" }
    }
    filter.date = { ...filter.date, $gte: date }
  }

  if (hasta !== undefined) {
    const date = new Date(hasta)
    if (Number.isNaN(date.getTime())) {
      return { error: "el parámetro 'hasta' no es una fecha válida" }
    }
    filter.date = { ...filter.date, $lte: date }
  }

  return { filter }
}

// GET
mensajesRouter.get('/', requireToken, async (req, res) => {
  const parsedQuery = parseMensajeQuery(req.query)
  if (parsedQuery.error) {
    return sendValidationError(res, [parsedQuery.error])
  }
  const pagination = parsePagination(req.query)
  if (pagination.error) {
    return sendValidationError(res, [pagination.error])
  }

  if (parsedQuery.filter.salaId && req.user.rol !== 'admin') {
    const sala = await Sala.findById(parsedQuery.filter.salaId)
    if (!sala) {
      return res.status(404).json({ error: 'no encontrado' })
    }
    const isMember = sala.listaMiembros.some(
      (id) => id.toString() === req.user.id
    )
    if (!isMember) {
      return res.status(403).json({ error: 'no eres miembro de esta sala' })
    }
  }

  const total = await Mensaje.countDocuments(parsedQuery.filter)
  const mensajes = await Mensaje.find(parsedQuery.filter)
    .sort({ date: -1 })
    .skip(pagination.offset)
    .limit(pagination.limit)
    .populate('usuarioId', 'nombre foto')
    .populate('salaId', 'nombre')

  res.set('X-Total-Count', String(total))
  res.json(mensajes)
})

// GET por id
mensajesRouter.get('/:id', requireToken, async (req, res) => {
  const mensaje = await Mensaje.findById(req.params.id)
    .populate('usuarioId', 'nombre foto')
    .populate('salaId', 'nombre')
  if (!mensaje) {
    return res.status(404).json({ error: 'no encontrado' })
  }
  res.json(mensaje)
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

  if (!Types.ObjectId.isValid(usuarioId) || !Types.ObjectId.isValid(salaId)) {
    return sendValidationError(res, [
      "los campos 'usuarioId' y 'salaId' deben ser ids válidos"
    ])
  }

  const [usuarioExiste, salaExiste] = await Promise.all([
    Usuario.exists({ _id: usuarioId }),
    Sala.exists({ _id: salaId })
  ])
  if (!usuarioExiste) {
    return sendValidationError(res, [
      "el campo 'usuarioId' no corresponde a un usuario existente"
    ])
  }
  if (!salaExiste) {
    return sendValidationError(res, [
      "el campo 'salaId' no corresponde a una sala existente"
    ])
  }

  if (req.user.rol !== 'admin') {
    const sala = await Sala.findById(salaId)
    const isMember = sala.listaMiembros.some(
      (id) => id.toString() === req.user.id
    )
    if (!isMember) {
      return res.status(403).json({ error: 'no eres miembro de esta sala' })
    }
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

    const deleted = await Mensaje.findByIdAndDelete(id)
    if (!deleted) {
      return res.status(404).json({ error: 'no encontrado' })
    }
    res.status(204).end()
  }
)

module.exports = mensajesRouter
