const { Types } = require('mongoose')
const salasRouter = require('express').Router()
const Sala = require('../models/Sala')
const Mensaje = require('../models/Mensaje')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { requireToken, requireRole, requireSalaAccess } = require('../utils/auth')
const { createRateLimiter } = require('../utils/rateLimit')

const limiterSalas = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyBy: (req) => req.user?.id
})

// GET
salasRouter.get('/', requireToken, async (req, res) => {
  if (req.user.rol === 'admin') {
    const salas = await Sala.find({})
    return res.json(salas)
  }
  const salas = await Sala.find({ listaMiembros: req.user.id })
  res.json(salas)
})

// GET por id
salasRouter.get('/:id', requireToken, requireSalaAccess, async (req, res) => {
  res.json(req.sala)
})

// POST
salasRouter.post('/', requireToken, limiterSalas, async (req, res) => {
  const { nombre, listaMiembros } = req.body

  const validationErrors = validateRequiredStringFields(req.body, ['nombre'])
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const members = new Set([req.user.id])
  if (Array.isArray(listaMiembros)) {
    for (const id of listaMiembros) {
      if (Types.ObjectId.isValid(id)) {
        members.add(id)
      }
    }
  }

  const newSala = new Sala({
    nombre,
    listaMiembros: [...members]
  })

  const savedSala = await newSala.save()
  res.json(savedSala)
})

// PATCH
salasRouter.patch(
  '/:id',
  requireToken,
  requireRole('admin'),
  limiterSalas,
  async (req, res) => {
    const { id } = req.params
    const { nombre, listaMiembros } = req.body

    const validationErrors = validateRequiredStringFields(req.body, ['nombre'])
    if (validationErrors.length > 0) {
      return sendValidationError(res, validationErrors)
    }

    const sala = await Sala.findById(id)
    if (!sala) {
      return res.status(404).json({ error: 'no encontrado' })
    }

    sala.nombre = nombre
    if (Array.isArray(listaMiembros)) {
      sala.listaMiembros = listaMiembros.filter((id) =>
        Types.ObjectId.isValid(id)
      )
    }
    const updatedSala = await sala.save()
    res.json(updatedSala)
  }
)

// POST /:id/miembros - add members
salasRouter.post(
  '/:id/miembros',
  requireToken,
  requireRole('admin'),
  limiterSalas,
  async (req, res) => {
    const { id } = req.params
    const { usuarioIds } = req.body

    if (!Array.isArray(usuarioIds) || usuarioIds.length === 0) {
      return sendValidationError(res, [
        "el campo 'usuarioIds' debe ser un array con al menos un id"
      ])
    }

    const sala = await Sala.findById(id)
    if (!sala) {
      return res.status(404).json({ error: 'no encontrado' })
    }

    for (const uid of usuarioIds) {
      if (!Types.ObjectId.isValid(uid)) {
        return sendValidationError(res, [
          "los campos en 'usuarioIds' deben ser ids válidos"
        ])
      }
    }

    const validIds = usuarioIds.filter((uid) =>
      sala.listaMiembros.every((m) => m.toString() !== uid)
    )
    sala.listaMiembros.push(...validIds)
    const updatedSala = await sala.save()
    res.json(updatedSala)
  }
)

// DELETE /:id/miembros/:usuarioId - remove member
salasRouter.delete(
  '/:id/miembros/:usuarioId',
  requireToken,
  requireRole('admin'),
  async (req, res) => {
    const { id, usuarioId } = req.params

    if (!Types.ObjectId.isValid(usuarioId)) {
      return sendValidationError(res, ['el id del usuario no es válido'])
    }

    const sala = await Sala.findById(id)
    if (!sala) {
      return res.status(404).json({ error: 'no encontrado' })
    }

    const memberIndex = sala.listaMiembros.findIndex(
      (m) => m.toString() === usuarioId
    )
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'el usuario no es miembro de esta sala' })
    }

    sala.listaMiembros.splice(memberIndex, 1)
    const updatedSala = await sala.save()
    res.json(updatedSala)
  }
)

// DELETE
salasRouter.delete(
  '/:id',
  requireToken,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params

    const sala = await Sala.findById(id)
    if (!sala) {
      return res.status(404).json({ error: 'no encontrado' })
    }

    await Mensaje.deleteMany({ salaId: id })
    await Sala.findByIdAndDelete(id)
    res.status(204).end()
  }
)

module.exports = salasRouter
