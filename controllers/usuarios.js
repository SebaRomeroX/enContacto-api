const usuariosRouter = require('express').Router()
const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const { validateRequiredStringFields, sendValidationError } = require('../utils/validation')
const { requireToken } = require('../utils/auth')


// GET
usuariosRouter.get('/', async (req, res) => {
  const usuarios = await Usuario.find({})
  res.json(usuarios)
})

// POST
usuariosRouter.post('/', requireToken, async (req, res) => {
  const {
    foto,
    nombre,
    contra,
    rol
  } = req.body

  const validationErrors = validateRequiredStringFields(req.body, ['nombre', 'contra'])
  if (rol !== undefined && rol !== null && typeof rol !== 'string') {
    validationErrors.push(`campo 'rol' debe ser un string`)
  }
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const passwordHash = await bcrypt.hash(contra, 10)
  const newUsuario = new Usuario({
    foto,
    nombre,
    contra: passwordHash,
    rol
  })
      
  const savedUsuario = await newUsuario.save()
  res.json(savedUsuario)
})


// DELETE
usuariosRouter.delete('/:id', requireToken, async (req, res) => {
  const { id } = req.params

  await Usuario.findByIdAndDelete(id)
  res.status(204).end()
})


module.exports = usuariosRouter