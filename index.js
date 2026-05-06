require('dotenv').config()
require('./mongo')

const express = require('express')   
const cors = require('cors')

const Mensaje = require('./models/Mensaje')

const app = express()
app.use(cors())
app.use(express.json())
//---




// ALGO
app.get('/algo', (req, res) => {
  res.json({
    mensaje: 'Algo en local'
  })
})




// GET
app.get('/api/mensajes', async (req, res) => {
  const mensajes = await Mensaje.find({})
  res.json(mensajes)
})




// POST
app.post('/api/mensajes', async (req, res) => {
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
  mensajes = mensajes.concat(savedMensaje)

  res.json(savedMensaje)
})







// SALIDA
const server = app.listen(3001, () => {
  console.log(`tamo ativo en ${3001}`)
})