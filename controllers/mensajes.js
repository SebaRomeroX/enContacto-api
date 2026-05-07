const mensajesRouter = require('express').Router()
const Mensaje = require('../models/Mensaje')

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
    
  const newMensaje = new Mensaje({
    mensaje,
    date: new Date(),
    usuarioId,
    salaId
  })
      
  const savedMensaje = await newMensaje.save()
  res.json(savedMensaje)
})


module.exports = mensajesRouter