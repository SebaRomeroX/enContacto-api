const jwt = require('jsonwebtoken')

function requireToken(req, res, next) {
  const authorization = req.get('authorization')

  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'token no válido' })
  }

  const token = authorization.substring(7)

  try {
    const decodedToken = jwt.verify(token, process.env.TOKEN_KEY)
    req.user = decodedToken
    next()
  } catch {
    return res.status(401).json({ error: 'token no válido' })
  }
}

module.exports = { requireToken }
