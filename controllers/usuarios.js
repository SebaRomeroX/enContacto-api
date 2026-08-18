const usuariosRouter = require('express').Router()
const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { requireToken, requireRole } = require('../utils/auth')

const ROLES_PERMITIDOS_CREACION = ['user', 'mod']

// GET
usuariosRouter.get('/', requireToken, async (req, res) => {
  const usuarios = await Usuario.find({})
  res.json(usuarios)
})

// POST
usuariosRouter.post('/', requireToken, async (req, res) => {
  const { foto, nombre, contra, rol } = req.body

  const validationErrors = validateRequiredStringFields(req.body, [
    'nombre',
    'contra'
  ])
  if (typeof contra === 'string' && contra.trim().length < 6) {
    validationErrors.push("campo 'contra' debe tener al menos 6 caracteres")
  }
  if (rol === 'admin') {
    validationErrors.push(
      `campo 'rol' no puede ser 'admin' (solo puede existir una cuenta admin)`
    )
  } else if (
    rol !== undefined &&
    rol !== null &&
    !ROLES_PERMITIDOS_CREACION.includes(rol)
  ) {
    validationErrors.push(
      `campo 'rol' debe ser uno de: ${ROLES_PERMITIDOS_CREACION.join(', ')}`
    )
  }
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const passwordHash = await bcrypt.hash(contra, 10)
  const newUsuario = new Usuario({
    foto,
    nombre,
    contra: passwordHash,
    rol: rol || 'user'
  })

  const savedUsuario = await newUsuario.save()
  res.json(savedUsuario)
})

// DELETE
usuariosRouter.delete(
  '/:id',
  requireToken,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params

    const target = await Usuario.findById(id)
    if (!target) {
      return res.status(404).json({ error: 'no encontrado' })
    }
    if (target.rol === 'admin') {
      return res
        .status(403)
        .json({ error: 'no se puede eliminar la cuenta admin' })
    }

    await Usuario.findByIdAndDelete(id)
    res.status(204).end()
  }
)

module.exports = usuariosRouter
