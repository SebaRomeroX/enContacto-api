const mensajesRouter = require('express').Router()
const Mensaje = require('../models/Mensaje')
const { validateRequiredStringFields, sendValidationError } = require('../utils/validation')

// GET
mensajesRouter.get('/', async (req, res) => {
  const mensajes = await Mensaje.find({})
  res.json(mensajes)
})

// POST
mensajesRouter.post('/', async (req, res) => {
  const {
    mensaje,
    usuarioId,
    salaId,
  } = req.body

  const validationErrors = validateRequiredStringFields(req.body, ['mensaje', 'usuarioId', 'salaId'])
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
mensajesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params

  await Mensaje.findByIdAndDelete(id)
  res.status(204).end()
})


module.exports = mensajesRouter