require('dotenv').config()
require('./mongo')

const express = require('express')   
const cors = require('cors')

const Mensaje = require('./models/Mensaje')
const mensajesRouter = require('./controllers/mensajes')

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


// MENSAJES
app.use('/api/mensajes', mensajesRouter)





// SALIDA
const server = app.listen(3001, () => {
  console.log(`tamo ativo en ${3001}`)
})