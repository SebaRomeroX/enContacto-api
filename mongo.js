const dns = require('node:dns/promises')
dns.setServers(['8.8.8.8', '1.1.1.1'])
const mongoose = require('mongoose')
const conectionString = process.env.MONGO_DB_URI

mongoose.connect(conectionString)
  .then(() => {
    console.log('Connnect DB enContacto')
  }).catch(err => {
    console.error(err)
  })