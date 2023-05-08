require('dotenv').config()
const { Telegraf } = require('telegraf')
const axios = require('axios')
const { ObjectId, MongoClient } = require('mongodb')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
axios.defaults.headers.common['User-Agent'] = `(${process.env.BOTNAME})`

let client = null

async function connectToDatabase() {
    client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    await client.connect()
    return client.db(process.env.MONGODB_NAME).collection(process.env.MONGODB_COLLECTION)
}

async function disconnectFromDatabase() {
    await client.close()
}

async function saveWebsiteStatus(url, status) {
    const collection = await connectToDatabase()
    await collection.insertOne({ 'url': url, 'status': status, timestamp: new Date() })
}

async function updateWebsiteStatus(url, status) {
    const collection = await connectToDatabase()
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
    if (existingDocument) {
        if (existingDocument.status !== status) {
            await updateWebsiteStatus(url, status)
            await disconnectFromDatabase()
            return true
        }
    } else {
        await saveWebsiteStatus(url, status)
        await disconnectFromDatabase()
        return true
    }

    await disconnectFromDatabase()
}

async function checkWebsite(url, searchText, checkStatus = false) {
    const collection = await connectToDatabase()
    const existingDocument = await collection.findOne({ url })
    let modification = false

    return axios.get(url)
        .then(async response => {
            if (response.status !== 200) {
                if (response.status === 429) {
                    if (checkStatus) {
                        modification = await setStatus(existingDocument, url, 'rate_limited')
                    }

                    if (modification || !checkStatus) {
                        return `La web está sufriendo algún tipo de ataque (ERR_CODE: ${response.status})`
                    }
                } else {
                    if (checkStatus) {
                        modification = await setStatus(existingDocument, url, 'offline')
                    }
                    if (modification || !checkStatus) {
                        return `${url} está caída con código de estado ${response.status}`
                    }
                }
            } else if (!response.data.includes(searchText)) {
                if (checkStatus) {
                    modification = await setStatus(existingDocument, url, 'text_not_found')
                }

                if (modification || !checkStatus) {
                    return `El texto de control no se ha encontrado en la URL ${url}`
                }
            } else {
                if (checkStatus) {
                    modification = await setStatus(existingDocument, url, 'online')
                }

                if (modification || !checkStatus) {
                    return `La página ${url} está funcionando correctamente`
                }
            }
        }).catch(error => {
            console.log(error)
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, `Error al acceder a ${url}: ${error.message}`)
            return
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
    const response = await checkWebsite(process.env.URL, process.env.SEARCH_TEXT, true)

    if (typeof response === 'string') {
        bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, response)
    }
}, 1000 * process.env.INTERVAL)