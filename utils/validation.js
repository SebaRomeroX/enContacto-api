function validateRequiredStringFields(body, requiredFields) {
  return requiredFields
    .filter((field) => {
      const value = body[field]
      return (
        value === undefined ||
        value === null ||
        typeof value !== 'string' ||
        value.trim() === ''
      )
    })
    .map(
      (field) => `campo '${field}' es obligatorio y debe ser un string no vacío`
    )
}

function sendValidationError(res, errors) {
  return res.status(400).json({
    error: 'solicitud inválida',
    detalles: errors
  })
}

module.exports = {
  validateRequiredStringFields,
  sendValidationError
}
