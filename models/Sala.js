const { model, Schema } = require('mongoose')

const salaSchema = new Schema({
  nombre: String
})

salaSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Sala = model('Sala', salaSchema)

module.exports = Sala
