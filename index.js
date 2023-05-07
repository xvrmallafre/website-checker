require('dotenv').config()
const { Telegraf } = require('telegraf')
const axios = require('axios')
const { ObjectId, MongoClient } = require('mongodb')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
axios.defaults.headers.common['User-Agent'] = `(${process.env.BOTNAME})`

async function connectToDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    await client.connect()
    return client.db(process.env.MONGODB_NAME).collection(process.env.MONGODB_COLLECTION)
}

async function saveWebsiteStatus(url, status) {
    const collection = await connectToDatabase();
    await collection.insertOne({ url, status, timestamp: new Date() });
}

async function updateWebsiteStatus(url, status) {
    const collection = await connectToDatabase();
    const existingDocument = await collection.findOne({ url });
    if (existingDocument) {
        await websiteStatusCollection.updateOne(
            { _id: ObjectId(existingDocument._id) },
            { $set: { status, timestamp: new Date() } }
        );
    } else {
        await saveWebsiteStatus(url, status, collection);
    }
}

async function saveWebsiteStatus(url, status, collection) {
    await collection.insertOne({
        url,
        status,
        timestamp: new Date()
    });
}

async function checkWebsite(url, searchText) {

    const collection = await connectToDatabase();
    //const existingDocument = await collection.findOne({ url });

    return axios.get(url)
        .then(response => {
            if (response.status !== 200) {
                if (response.status == 429) {

                    return `La web está sufriendo algún tipo de ataque`
                } else {
                    return `${url} está caído con código de estado ${response.status}`
                }
            } else if (!response.data.includes(searchText)) {
                return `El texto de control no se ha encontrado en la URL ${url}`
            } else {
                return `La página ${url} está funcionando correctamente`
            }
        }).catch(error => {
            bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `Error al acceder a ${url}: ${error.message}`)
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
    const response = await checkWebsite(process.env.URL, process.env.SEARCH_TEXT)

    bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, response)
}, 1000 * process.env.INTERVAL)