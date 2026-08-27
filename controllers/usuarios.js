const usuariosRouter = require('express').Router()
const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { requireToken, requireRole } = require('../utils/auth')
const { createRateLimiter } = require('../utils/rateLimit')

const limiterUsuarios = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyBy: (req) => req.user?.id
})

// GET
usuariosRouter.get('/', requireToken, async (req, res) => {
  const usuarios = await Usuario.find({})
  res.json(usuarios)
})

// GET por id
usuariosRouter.get('/:id', requireToken, async (req, res) => {
  const usuario = await Usuario.findById(req.params.id)
  if (!usuario) {
    return res.status(404).json({ error: 'no encontrado' })
  }
  res.json(usuario)
})

// POST
usuariosRouter.post('/', requireToken, limiterUsuarios, async (req, res) => {
  const { nombre } = req.body

  const validationErrors = validateRequiredStringFields(req.body, ['nombre'])
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const existingUser = await Usuario.findOne({ nombre })
  if (existingUser) {
    return res.status(400).json({
      error: 'solicitud inválida',
      detalles: ["el campo 'nombre' ya está en uso"]
    })
  }

  const defaultPassword = '777'
  const defaultFoto = 'no-foto.png'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  const newUsuario = new Usuario({
    nombre,
    contra: passwordHash,
    foto: defaultFoto,
    rol: 'user'
  })

  const savedUsuario = await newUsuario.save()
  res.json(savedUsuario)
})

// PATCH
usuariosRouter.patch(
  '/:id',
  requireToken,
  limiterUsuarios,
  async (req, res) => {
    const { id } = req.params
    const { foto, nombre, contra, contraActual, rol } = req.body
    const esSelf = req.user.id === id

    const target = await Usuario.findById(id)
    if (!target) {
      return res.status(404).json({ error: 'no encontrado' })
    }

    const validationErrors = []

    if (nombre !== undefined) {
      validationErrors.push("el campo 'nombre' no es modificable por ahora")
    }

    if (esSelf) {
      if (rol !== undefined) {
        validationErrors.push(
          "el campo 'rol' solo puede modificarlo el admin sobre otros usuarios"
        )
      }
      if (contra !== undefined) {
        if (typeof contra !== 'string' || contra.trim().length < 6) {
          validationErrors.push('campo contra debe tener al menos 6 caracteres')
        }
        if (typeof contraActual !== 'string' || contraActual.trim() === '') {
          validationErrors.push(
            "para cambiar 'contra' se requiere el campo 'contraActual'"
          )
        }
      } else if (contraActual !== undefined) {
        validationErrors.push(
          "el campo 'contraActual' solo aplica cuando se envía 'contra'"
        )
      }
      if (foto !== undefined && typeof foto !== 'string') {
        validationErrors.push("el campo 'foto' debe ser un string")
      }
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors)
      }
      if (contra !== undefined) {
        const actualCorrecta = await bcrypt.compare(contraActual, target.contra)
        if (!actualCorrecta) {
          return sendValidationError(res, [
            "el campo 'contraActual' no coincide"
          ])
        }
        target.contra = await bcrypt.hash(contra, 10)
      }
      if (foto !== undefined) {
        target.foto = foto
      }
    } else {
      if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'no autorizado para esta acción' })
      }
      if (target.rol === 'admin') {
        return res
          .status(403)
          .json({ error: 'no se puede modificar la cuenta admin' })
      }
      if (
        foto !== undefined ||
        contra !== undefined ||
        contraActual !== undefined
      ) {
        validationErrors.push(
          "solo el propio usuario puede modificar 'foto' o 'contra'"
        )
      }
      if (rol !== undefined && !['user', 'mod'].includes(rol)) {
        validationErrors.push("campo 'rol' debe ser uno de: user, mod")
      }
      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors)
      }
      if (rol !== undefined) {
        target.rol = rol
      }
    }

    const updatedUsuario = await target.save()
    res.json(updatedUsuario)
  }
)

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
