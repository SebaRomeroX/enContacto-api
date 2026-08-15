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

  res.status(500).json({
    error: 'error interno del servidor'
  })
}

module.exports = { errorHandler }
