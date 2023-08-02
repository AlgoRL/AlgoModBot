require('dotenv/config');

// const client = require('C:\\Users\\iiisa\\Desktop\\New folder\\SteamBotNew\\SteamBot\\index.js');

const { SlashCommandBuilder, EmbedBuilder, Client, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const axios = require("axios");

const SteamAPI = require('steamapi');
const steam = new SteamAPI(process.env.STEAM_TOKEN);

const fs = require('fs');

const VERIFIED_ROLE = process.env.VERIFIED_ROLE;

module.exports = {
    data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify your account between Discord and Steam.")
    .setDMPermission(false)
    .addStringOption(option => option
        .setName("steam-user-id")
        .setDescription("Your Steam User ID belongs to here."))
    .addStringOption(option => option
        .setName("epic-user-id")
        .setDescription("Your Epic Games User ID belongs to here.")),
    /**
     * 
     * @param {Client} client 
     * @param {ChatInputCommandInteraction} interaction 
     */

    // test
    
    async execute(client, interaction) {
        const SteamUserID = interaction.options.getString("steam-user-id");
        const EpicUserID = interaction.options.getString("epic-user-id");
    
        const CantAcceptTwoEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Oops")
        .setDescription("Nice try buster. You can only verify one ID. Make sure you use the ID of the account you want to play with.")

        // wrecks nerds who try to submit both steam and epic ID in same request
       if (SteamUserID && EpicUserID) return interaction.reply({ embeds: [CantAcceptTwoEmbed] });

       // creates embed and buttons for steam input
       if (SteamUserID) {
        console.log("Steam ID given. Creating steam embed");
        try {

            const summary = await steam.getUserSummary(SteamUserID);

            console.log(summary)

            const Embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Is this you?")
            .addFields(
                {
                    name: "Nickname",
                    value: summary.nickname
                }
            )
            .setThumbnail(summary.avatar.large)
    
            const YesButton = new ButtonBuilder()
            .setCustomId("Yes_Button")
            .setLabel("Yes")
            .setStyle(ButtonStyle.Primary)
            
            const NoButton = new ButtonBuilder()
            .setCustomId("No_Button")
            .setLabel("No")
            .setStyle(ButtonStyle.Secondary)
    
            const row = new ActionRowBuilder()
            .addComponents(YesButton, NoButton)
    
            await interaction.reply({
                embeds: [Embed],
                components: [row]
            })
    
        } catch (Err) {
            console.log("Error 1: ", Err)
            const ErrorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Error occurred")
            .setDescription(Err.message)

            if (Err.message.includes("Invalid/no id provided")) {
                ErrorEmbed.setDescription("Invalid Steam User ID. How to find you ID -> <#1062405855741481093>")
            }

            if (interaction.deferred) {
                return interaction.deferReply({ embeds: [ErrorEmbed] });
            }

            if (interaction.replied) {
                return interaction.editReply({ embeds: [ErrorEmbed] });
            } else {
                return interaction.reply({ embeds: [ErrorEmbed] });
            }

        }

        const filter = (i) => i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 60000
        });

        collector.on("collect", async (inter) => {
            if (!inter.isButton()) return;

            const buttonId = inter.customId;

            switch(buttonId) {
                case "Yes_Button": // Yes clicked code
                    console.log("Yes clicked.")
                    await inter.deferUpdate({ components: [] });

                    console.log("!!!!STEAM 1!!!!")
                    const memberRoles = interaction.member.roles.cache;
                    const allRoles = memberRoles.map(role => role.id).join('.');
                    
                    const filePath = './input.txt'
                    const myData = `${SteamUserID}|${interaction.user.username}|${interaction.member.id}|${interaction.user.avatar}|${allRoles},\n`;

                    // Write the data to the text file
                    fs.writeFile(filePath, myData, (err) => {
                    if (err) {
                    console.error('Error writing to the file:', err);
                    return;
                    }
                     console.log('Data has been written to the file successfully!');
                  });
                  
                  const { exec } = require('child_process');
                  const path = require('path');

                  const dir = __dirname + "../../../";  
                  const exePath = path.join(dir, 'ServerConsoleApp.exe');
                  console.log('Execute: ', exePath)
  
                    exec(exePath, (error) => {
                      if (error) {
                        console.error('Error occurred while running the .exe file:', error);
                        return;
                      }
                      console.log('Successfully executed the .exe file.');
                    });

                    await interaction.member.roles.add(VERIFIED_ROLE).catch(err => console.log("Error 2: ", err));
                    console.log("given verified role")

                    const SuccessEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Successfully set up your ID!")
                    .setDescription("Your information has been sent to our servers! The servers should be ready in under a minute. Now go to the AlgoMod app.")

                    return inter.followUp({ embeds: [SuccessEmbed] });

                case "No_Button": // No clicked code
                    console.log("No clicked")
                    await inter.deferUpdate({ components: [] });

                    const CanceledEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Successfully Cancelled Process")
                    .setDescription("Run the command again with the desired Steam ID. How to get Steam ID -> <#1062405855741481093>")

                    return inter.followUp({ embeds: [CanceledEmbed] });
                
                default:
                    console.log("Unknown Button ID.")
            }
        });

        collector.on("end", async (collected, reason) => {
            if (collected.size === 0) {
                await inter.deferUpdate({ components: [] });
                
                const TimeoutEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Timeout")
                .setDescription("The request has been timed out due to inactivity.")

                await interaction.followUp({
                    embeds: [TimeoutEmbed]
                })
            }
        });
        // creates embed and buttons for epic input
       } else if (EpicUserID) {
        console.log("Epic ID given. Creating embed");

        // test error embed
        if (EpicUserID.length != 32)
        {
            console.log("Invalid Epic ID")
            const ErrorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Error occurred")
            .setDescription("Invalid Epic ID")


                ErrorEmbed.setDescription("Invalid Epic User ID. How to find you ID -> <#1062405855741481093>")


            if (interaction.deferred) {
                return interaction.deferReply({ embeds: [ErrorEmbed] });
            }

            if (interaction.replied) {
                return interaction.editReply({ embeds: [ErrorEmbed] });
            } else {
                return interaction.reply({ embeds: [ErrorEmbed] });
            }
        }

        const Embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Are you sure this is your Account ID? You can only do this once.")
        .addFields(
            {
                name: "Account ID",
                value: EpicUserID
            }
        )

        const YesButton = new ButtonBuilder()
        .setCustomId("Yes_Button")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Primary)
        
        const NoButton = new ButtonBuilder()
        .setCustomId("No_Button")
        .setLabel("No")
        .setStyle(ButtonStyle.Secondary)

        const row = new ActionRowBuilder()
        .addComponents(YesButton, NoButton)

        await interaction.reply({
            embeds: [Embed],
            components: [row]
        })

        const filter = (i) => i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 60000
        });

        collector.on("collect", async (inter) => {
            if (!inter.isButton()) return;

            const buttonId = inter.customId;

            switch(buttonId) {
                case "Yes_Button":
                    await inter.deferUpdate({ components: [] });

                    console.log("!!!!EPIC 1!!!!")
                    

                                            const memberRoles = interaction.member.roles.cache;
                                            const allRoles = memberRoles.map(role => role.id).join('.');

                                            const filePath = './input.txt'
                                            const myData = `${EpicUserID}|${interaction.user.username}|${interaction.member.id}|${interaction.user.avatar}|${allRoles},\n`;

                                            
                    // Write the data to the text file
                    fs.writeFile(filePath, myData, (err) => {
                        if (err) {
                        console.error('Error writing to the file:', err);
                        return;
                        }
                         console.log('Data has been written to the file successfully!');
                      });

                    const { exec } = require('child_process');
                    const path = require('path');

                    const dir = __dirname + "../../../";  
                    const exePath = path.join(dir, 'ServerConsoleApp.exe');
                    console.log('Execute: ', exePath)
    
                      exec(exePath, (error) => {
                        if (error) {
                          console.error('Error occurred while running the .exe file:', error);
                          return;
                        }
                        console.log('Successfully executed the .exe file.');
                      });

                    await interaction.member.roles.add(VERIFIED_ROLE).catch(err => console.log("Error 3: ", err));

                    const SuccessEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Successfully set up your ID!")
                    .setDescription("Your information has been sent to our servers! The servers should be ready in under a minute. Now go to the AlgoMod app.")

                    return inter.followUp({ embeds: [SuccessEmbed] });

                case "No_Button":
                    await inter.deferUpdate({ components: [] });

                    const CanceledEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Successfully Cancelled Process")
                    .setDescription("Run the command again with the desired Epic Games username. How to get Epic ID -> <#1062405855741481093>")

                    return inter.followUp({ embeds: [CanceledEmbed] });
                
                default:
                    console.log("Unknown Button ID.")
            }
        });

        collector.on("end", async (collected, reason) => {
            if (collected.size === 0) {
                await inter.deferUpdate({ components: [] });
                
                const TimeoutEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Timeout")
                .setDescription("The request has been timed out due to inactivity.")

                await interaction.followUp({
                    embeds: [TimeoutEmbed]
                })
            }
        });
       }
    }
}