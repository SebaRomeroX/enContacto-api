const loginRouter = require('express').Router()
const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validateRequiredStringFields, sendValidationError } = require('../utils/validation')


loginRouter.post('/', async (req, res) => {
  const { body } = req
  const { nombre, contra } = body

  const validationErrors = validateRequiredStringFields(body, ['nombre', 'contra'])
  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors)
  }

  const user = await Usuario.findOne({ nombre })

  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(contra, user.contra)

  if(!passwordCorrect) {
    return res.status(401).json({
      error: 'datos incorrectos'
    })
  }

  const userForToken = {
    id: user._id,
    nombre: user.nombre
  }
  const token = jwt.sign(
    userForToken,
    process.env.TOKEN_KEY,
    {
      expiresIn: 60 * 60 * 24  
    }
  )

  res.send({
    nombre: user.nombre,
    token
  })
})

module.exports = loginRouter