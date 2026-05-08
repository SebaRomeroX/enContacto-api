const salasRouter = require('express').Router()
const Sala = require('../models/Sala')


// GET
salasRouter.get('/', async (req, res) => {
  const salas = await Sala.find({})
  res.json(salas)
})

// POST
salasRouter.post('/', async (req, res) => {
  const {
    nombre
  } = req.body
    
  const newSala = new Sala({
    nombre
  })
      
  const savedSala = await newSala.save()
  res.json(savedSala)
})


// DELETE
salasRouter.delete('/:id', async (req, res) => {
  const { id } = req.params

  Sala.findByIdAndDelete(id).then(result => {
    res.status(204).end()
  }).catch(error => console.log(error))

  res.status(204).end()
})


module.exports = salasRouter