const { model, Schema } = require('mongoose')

const usuarioSchema = new Schema({
  foto: String,
  nombre: String,
  contra: String,
  rol: { type: String, enum: ['admin', 'user', 'mod'], default: 'user' }
})

usuarioSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.contra
  }
})

const Usuario = model('Usuario', usuarioSchema)

module.exports = Usuario
