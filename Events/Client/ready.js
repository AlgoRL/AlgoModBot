const { loadCommands } = require('../../Functions/loadCommands');
const { ActivityType } = require('discord.js');

module.exports = {
    name: "ready",
    once: true,
    execute(client) {

        loadCommands(client)

        client.user.setActivity("Server", { type: ActivityType.Watching });

        console.log("Ready!")
    }
}