const { Client, ChatInputCommandInteraction, EmbedBuilder, CommandInteraction } = require('discord.js')

module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

        console.log(interaction.commandName)

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            const NotFoundCmd = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Unable to Run the Command")
            .setDescription("The command is outdated.")

            return interaction.reply({ embeds: [NotFoundCmd] });
        }

        const allowedChannelIDs = command.AllowChannelIDs;

        if (allowedChannelIDs && allowedChannelIDs.length !== 0) {
            if (!allowedChannelIDs.includes(interaction.channelId)) {
                const NotAllowed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Sorry.")
                .setDescription("The Slash Command is not allowed to run in this channel. Please try again in a different channel.")
                .addFields(
                    {
                        name: "Allowed Channels",
                        value: `${allowedChannelIDs.toString()}`
                    }
                )

                return interaction.reply({ embeds: [NotAllowed] });
            }
        }

        try {
            if (interaction.isChatInputCommand()) {
                command.execute(client, interaction);
            } else if (interaction.isContextMenuCommand()) {
                command.contextExecute(client, interaction)
            }
        } catch (Err) {
            const ErrorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Error")
            .setDescription(Err.message)

            if (interaction.deferred) {
                return interaction.deferReply({ embeds: [ErrorEmbed] });
            }

            if (interaction.replied) {
                return interaction.editReply({ embeds: [ErrorEmbed] });
            }

            return interaction.reply({ embeds: [ErrorEmbed] });
        }
    }
}