const jwt = require('jsonwebtoken')
const { getTokenKey } = require('./config')

function requireToken(req, res, next) {
  const authorization = req.get('authorization')

  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'token no válido' })
  }

  const token = authorization.substring(7)

  try {
    const decodedToken = jwt.verify(token, getTokenKey())
    req.user = decodedToken
    next()
  } catch {
    return res.status(401).json({ error: 'token no válido' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'no autorizado para esta acción' })
    }
    next()
  }
}

async function requireSalaAccess(req, res, next) {
  const Sala = require('../models/Sala')
  const sala = await Sala.findById(req.params.id)
  if (!sala) {
    return res.status(404).json({ error: 'no encontrado' })
  }

  if (req.user.rol === 'admin') {
    req.sala = sala
    return next()
  }

  const isMember = sala.listaMiembros.some(
    (id) => id.toString() === req.user.id
  )
  if (!isMember) {
    return res.status(403).json({ error: 'no eres miembro de esta sala' })
  }

  req.sala = sala
  next()
}

module.exports = { requireToken, requireRole, requireSalaAccess }
