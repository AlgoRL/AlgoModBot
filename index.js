require("dotenv/config");
const fs = require('fs');

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

module.exports = client; // exports client (i think)

client.login(process.env.TOKEN).then(() => {
    console.log("Logged in!")
})

  // Event: When a message is received
  client.on('messageCreate', (message) => {
  
    // Filter messages from a unsub
    if (message.channel.id === '1134701978329559160') {
      // Get the content of the message
      const content = message.content;
  
      // Write the content to 'output.txt'
      fs.appendFile('output.txt', `${content}\n`, (err) => {
        if (err) throw err;
        console.log(`Message written to 'output.txt': ${content}`);
      });

      // run code to run exe
      const { exec } = require('child_process');
      const path = require('path');

      const dir = __dirname;  
      const exePath = path.join(dir, 'ServerConsoleApp.exe');
      console.log('Execute: ', exePath)

        exec(exePath, (error) => {
          if (error) {
            console.error('Error occurred while running the .exe file:', error);
            return;
          }
          console.log('Successfully executed the .exe file.');
        });
    }
  });