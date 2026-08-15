const { model, Schema } = require('mongoose')

const mensajeSchema = new Schema({
  mensaje: String,
  usuarioId: String,
  salaId: String,
  date: Date
})

mensajeSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Mensaje = model('Mensaje', mensajeSchema)

module.exports = Mensaje
