require('dotenv').config();

const { Wit } = require('node-wit');
const Discord = require('discord.js');
const client = new Discord.Client();

const witClient = new Wit({ accessToken: process.env.WIT_TOKEN });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

let joke = false;

async function getResponse(data) {
    if (data.entities.greetings) {
        if (data.entities.greetings[0].value) {
            return "Hi. Where are you from?"
        }
    }
    if (data.entities.bye) {
        return "I hope you'll come back quickly\nBye"
    }
    if (data.entities.location) {
        const location = data.entities.location[0].resolved.values[0]
        const type = (() => {
            switch (location.grain) {
                case 'country':
                    return 'country'
            }
            return 'city'
        })()
        const name = await (async () => {
            if (type == "country") {
                const response = await fetch(`https://restcountries.eu/rest/v2/name/${location.name}`);
                const data = await response.json()
                return data[0].alpha2Code;
            }
            return location.name
        })()
        const parameters = (await (await fetch('https://api.openaq.org/v1/parameters')).json()).results
        const result = []
        for (const param of parameters) {
            const url = `https://api.openaq.org/v1/measurements?${type}=${name}&limit=1&parameter=${param.id}`
            console.log(url)
            const response = await fetch(url);
            console.log(response)
            const airQualityData = await response.json()
            if (airQualityData.results.length > 0) {
                result.push({ name: param.name, value: airQualityData.results[0].value, unit: airQualityData.results[0].unit })
            }
        }
        if (result.length == 0) {
            return "I couldn't find air quality for your location :'("
        }
        console.log(result)
        return `I found air quality params in your locations:\n${result.map(x=>`${x.name}: ${x.value} ${x.unit}`).join('\n')}`
    }
    if (data.entities.intent) {
        if (data.entities.intent[0].value === "name") {
            if (data.entities.person) {
                if (data.entities.person[0].value === "bot") {
                    return "I'm Andrzej"
                }
            }
        }
        if (data.entities.intent[0].value === "joke") {
            joke = true
            return "I know a Joke.\nDo you know which blood category an IT programmer has?"
        }
        if (data.entities.intent[0].value === "dont_know") {
            if (joke) {
                joke = false
                return "C"
            } else {
                return "What do you want to know"
            }
        }
    }
    return "I don't know. I'm sorry :("
}

const ticksSinceLastMessage = 0

client.on('message', msg => {
    if (msg.author.username !== "Botty" && msg.author.discriminator !== "9944") {
        if (msg.content === 'ping') {
            msg.reply('pong');
        } else {
            witClient.message(msg.content, {})
                .then(async (data) => {
                    msg.reply(await getResponse(data))
                })
                .catch(e => {
                    console.error(e)
                    msg.reply("Errorrrrrrr :/")
                })
        }
    }
});


client.login(process.env.DISCORD_TOKEN);