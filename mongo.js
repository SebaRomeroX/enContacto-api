const dns = require('node:dns/promises')
dns.setServers(['8.8.8.8', '1.1.1.1'])
const mongoose = require('mongoose')
const { getMongoDbUri } = require('./utils/config')
const connectionString = getMongoDbUri()

mongoose
  .connect(connectionString)
  .then(() => {
    console.log('Connect DB enContacto')
  })
  .catch((err) => {
    console.error(err)
  })
