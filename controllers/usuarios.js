const usuariosRouter = require('express').Router()
const Usuario = require('../models/Usuario')
const bcrypt = require('bcryptjs')


// GET
usuariosRouter.get('/', async (req, res) => {
  const usuarios = await Usuario.find({})
  res.json(usuarios)
})

// POST
usuariosRouter.post('/', async (req, res) => {
  const {
    foto,
    nombre,
    contra,
    rol
  } = req.body
    
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
usuariosRouter.delete('/:id', async (req, res) => {
  const { id } = req.params

  await Usuario.findByIdAndDelete(id)
  res.status(204).end()
})


module.exports = usuariosRouter