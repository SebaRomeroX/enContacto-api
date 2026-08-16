require('dotenv').config()
require('./mongo')

const express = require('express')
const cors = require('cors')

const mensajesRouter = require('./controllers/mensajes')
const usuariosRouter = require('./controllers/usuarios')
const salasRouter = require('./controllers/salas')
const loginRouter = require('./controllers/login')
const { errorHandler } = require('./utils/errorHandler')

const app = express()
app.set('trust proxy', 1)
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

// USUARIOS
app.use('/api/usuarios', usuariosRouter)

// SALAS
app.use('/api/salas', salasRouter)

// LOGIN
app.use('/api/login', loginRouter)

// MANEJO DE ERRORES GLOBAL
app.use(errorHandler)

// SALIDA LOCAL
if (require.main === module) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`)
  })
}

// EXPORT PARA VERCEL
module.exports = app
