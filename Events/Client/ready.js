const { loadCommands } = require('../../Functions/loadCommands');
const { ActivityType } = require('discord.js');

module.exports = {
    name: "ready",
    once: true,
    execute(client) {

        loadCommands(client)

        client.user.setActivity("AlgoMod", { type: ActivityType.Watching });

        console.log("Ready!")
    }
}