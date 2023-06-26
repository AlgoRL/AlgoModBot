require("dotenv/config");

const { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const { Guilds, GuildMembers, GuildMessages, MessageContent, DirectMessages } = GatewayIntentBits;
const { User, Message, GuildMember, Channel } = Partials;

const client = new Client({
    intents: [Guilds, GuildMembers, GuildMessages, MessageContent, DirectMessages],
    partials: [User, Message, GuildMember, Channel]
});

const { connect } = require("mongoose");
const { loadEvents } = require('./Functions/loadEvents');

connect(process.env.MONGODB_STRING, { 
    useUnifiedTopology: true,
    useNewUrlParser: true,
}).then(() => {
  console.log("Connected to MongoDB.")
}).catch(err => console.log(err));
loadEvents(client);

client.events = new Collection();
client.commands = new Collection();

client.login(process.env.TOKEN).then(() => {
    console.log("Logged in!")
})