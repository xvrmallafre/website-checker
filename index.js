const { Telegraf } = require('telegraf')
const { ObjectId, MongoClient } = require('mongodb')
const axios = require('axios')
const log = require('fancy-log')
require('dotenv').config()

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
axios.defaults.headers.common['User-Agent'] = `Mozilla/5.0+(compatible; ${process.env.BOTNAME})`

let dbClient = null
let dbCollection = null
let queue = true
const interval = (process.env.INTERVAL && !isNaN(process.env.INTERVAL) && process.env.INTERVAL >= 4) ? process.env.INTERVAL : 7

async function cleanup() {
    log('Cleaning up...')
    if (dbClient) {
        await dbClient.close()
    }
}

process.on('beforeExit', cleanup)
process.on('SIGINT', async () => {
    await cleanup()
    process.exit(0)
});

async function getDbCollection() {
    if (!dbClient) {
        dbClient = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await dbClient.connect();
    }

    if (!dbCollection) {
        dbCollection = dbClient.db(process.env.MONGODB_NAME).collection(process.env.MONGODB_COLLECTION);
    }

    try {
        await dbCollection.findOne({});
    } catch (err) {
        log('Database connection lost. Reconnecting...')
        await dbClient.connect()
    }

    return dbCollection
}

async function saveWebsiteStatus(url, status) {
    const collection = await getDbCollection()
    await collection.insertOne({ 'url': url, 'status': status, timestamp: new Date() })
}

async function updateWebsiteStatus(url, status) {
    const collection = await getDbCollection()
    const existingDocument = await collection.findOne({ url })
    if (existingDocument) {
        await collection.updateOne(
            { _id: new ObjectId(existingDocument._id) },
            {
                $set: { 'status': status, timestamp: new Date() }
            })
    } else {
        await saveWebsiteStatus(url, status)
    }
}

async function setStatus(existingDocument, url, status) {
    if (existingDocument && existingDocument?.status !== status) {
        await updateWebsiteStatus(url, status)
        return true
    } else if (!existingDocument) {
        await saveWebsiteStatus(url, status)
        return true
    }
    return false
}

async function checkWebsite(url, searchText, checkStatus = false) {
    queue = false
    const collection = await getDbCollection()
    const existingDocument = await collection.findOne({ url })
    let modification = false

    return axios.get(url)
        .then(async response => {
            let successMessage
            let successStatus

            if (typeof response.data === 'object') {
                response.data = JSON.stringify(response.data)
            }

            if (!response?.data?.includes(searchText)) {
                successMessage = `El texto de control no se ha encontrado en la URL ${url}`
                successStatus = 'text_not_found'
            } else {
                successMessage = `La página ${url} está funcionando correctamente`
                successStatus = 'online'
            }
            if (checkStatus) {
                modification = await setStatus(existingDocument, url, successStatus)
            }
            if (modification || !checkStatus) {
                return successMessage
            }
        }).catch(async err => {
            let errorMessage
            let errorStatus
            if (!err.response) {
                errorMessage = `${url} está caída (TIMEOUT)`
                errorStatus = 'timeout'
            } else if (err.response.status === 429) {
                errorMessage = `La web está sufriendo algún tipo de ataque (ERR_CODE: ${err.response.status})`
                errorStatus = 'rate_limited'
            } else {
                errorMessage = `${url} está caída (ERR_CODE: ${err.response.status})`
                errorStatus = 'offline'
            }
            if (checkStatus) {
                modification = await setStatus(existingDocument, url, errorStatus)
            }
            if (modification || !checkStatus) {
                return errorMessage
            }
        })
}

bot.use((ctx, next) => {
    if (ctx.chat.id == process.env.TELEGRAM_CHAT_ID) {
        next()
    } else {
        ctx.reply('No tienes permisos para ejecutar este comando')
    }
})

bot.start((ctx) => {
    ctx.reply(`Soy un bot que se encarga de monitorear que el sitió web ${process.env.URL} sigue en linea y no se cae.`)
})

bot.command('check', async (ctx) => {
    const url = process.env.URL
    const searchText = process.env.SEARCH_TEXT
    const message = await checkWebsite(url, searchText)

    ctx.reply(message)
})

bot.launch()

setInterval(async () => {
    if (queue) {
        const response = await checkWebsite(process.env.URL, process.env.SEARCH_TEXT, true)

        if (typeof response === 'string') {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, response)
        }

        queue = true
    }
}, 1000 * interval)