function errorHandler(error, req, res, next) {
  console.error(error)

  if (res.headersSent) {
    return next(error)
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'id inválido'
    })
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'solicitud inválida',
      detalles: Object.values(error.errors).map((e) => e.message)
    })
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'solicitud inválida'
    })
  }

  if (error.code === 11000) {
    return res.status(400).json({
      error: 'solicitud inválida',
      detalles: [
        `el campo '${Object.keys(error.keyPattern)[0]}' ya está en uso`
      ]
    })
  }

  res.status(500).json({
    error: 'error interno del servidor'
  })
}

module.exports = { errorHandler }
