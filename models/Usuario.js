const { model, Schema } = require('mongoose')

const usuarioSchema = new Schema({
  foto: String,
  nombre: String,
  contra: String,
  rol: String
})

usuarioSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Usuario = model('Usuario', usuarioSchema)

module.exports = Usuario