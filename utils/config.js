const REQUIRED_ENV = ['TOKEN_KEY', 'MONGO_DB_URI']

function getTokenKey() {
  return process.env.TOKEN_KEY
}

function getMongoDbUri() {
  return process.env.MONGO_DB_URI
}

function getPort() {
  return process.env.PORT || 3001
}

function validateEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. Revisa tu archivo .env (ver .env.example).`
    )
  }
}

module.exports = { getTokenKey, getMongoDbUri, getPort, validateEnv }
