function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  return forwarded || req.ip || 'unknown'
}

function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 10,
  keyBy = clientKey
} = {}) {
  const hits = new Map()

  function prune(now) {
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) {
        hits.delete(key)
      }
    }
  }

  function rateLimit(req, res, next) {
    const now = Date.now()
    prune(now)

    const key = keyBy(req) || clientKey(req)
    const entry = hits.get(key)

    if (!entry) {
      hits.set(key, { start: now, count: 1 })
      return next()
    }

    if (entry.count >= max) {
      return res.status(429).json({
        error: 'demasiados intentos, intente más tarde'
      })
    }

    entry.count += 1
    next()
  }

  rateLimit.reset = () => hits.clear()

  return rateLimit
}

module.exports = { createRateLimiter }
