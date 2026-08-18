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

module.exports = { requireToken, requireRole }
