const loginRouter = require('express').Router()
const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
  validateRequiredStringFields,
  sendValidationError
} = require('../utils/validation')
const { createRateLimiter } = require('../utils/rateLimit')
const { getTokenKey } = require('../utils/config')

loginRouter.post(
  '/',
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req, res) => {
    const { body } = req
    const { nombre, contra } = body

    const validationErrors = validateRequiredStringFields(body, [
      'nombre',
      'contra'
    ])
    if (validationErrors.length > 0) {
      return sendValidationError(res, validationErrors)
    }

    const user = await Usuario.findOne({ nombre })

    const passwordCorrect =
      user === null ? false : await bcrypt.compare(contra, user.contra)

    if (!passwordCorrect) {
      return res.status(401).json({
        error: 'datos incorrectos'
      })
    }

    const userForToken = {
      id: user._id,
      nombre: user.nombre,
      rol: user.rol
    }
    const token = jwt.sign(userForToken, getTokenKey(), {
      expiresIn: 60 * 60 * 24
    })

    res.send({
      nombre: user.nombre,
      token
    })
  }
)

module.exports = loginRouter
