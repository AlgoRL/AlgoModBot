require('dotenv/config');

const { SlashCommandBuilder, EmbedBuilder, Client, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const axios = require("axios");

const SteamAPI = require('steamapi');
const steam = new SteamAPI(process.env.STEAM_TOKEN);

const fileData = require('../../Models/fileData');

const { google } = require('googleapis');
const fs = require('fs');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const VERIFIED_ROLE = process.env.VERIFIED_ROLE;

const oautho2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
)

oautho2Client.setCredentials({refresh_token: REFRESH_TOKEN})

const drive = google.drive({ version: 'v3', auth: oautho2Client });

async function getEpicUserData(userId, accessToken) {
    const headers = {
      'Authorization': `Bearer ${accessToken}`
    };
    const url = `https://account-public-service-prod03.ol.epicgames.com/account/api/public/account/${userId}`;
    const res = await axios.get(url, { headers });
    return res.data;
}

module.exports = {
    AllowChannelIDs: ["1114749589053001829", "1114749764123230268", "1114749876132139060"],
    data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify your account between Discord and Steam.")
    .setDMPermission(false)
    .addStringOption(option => option
        .setName("steam-user-id")
        .setDescription("Your steam User ID belongs to here."))
    .addStringOption(option => option
        .setName("epic-user-id")
        .setDescription("Your Epic Games User ID belongs to here.")),
    /**
     * 
     * @param {Client} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(client, interaction) {
        const SteamUserID = interaction.options.getString("steam-user-id");
        const EpicUserID = interaction.options.getString("epic-user-id");

        const getFileDataFromDB = await fileData.findOne({ GuildId: interaction.guildId });

        const CantAcceptTwoEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Oops")
        .setDescription("I can't accept two user IDs, please verify either using Your Steam User ID, or Epic Games User ID.")

       if (SteamUserID && EpicUserID) return interaction.reply({ embeds: [CantAcceptTwoEmbed] });

       if (SteamUserID) {
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
            console.log(Err)
            const ErrorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Error occurred")
            .setDescription(Err.message)

            if (Err.message.includes("Invalid/no id provided")) {
                ErrorEmbed.setDescription("Invalid Steam User ID.")
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
                case "Yes_Button":
                    await inter.deferUpdate({ components: [] });

                    const filePath = "data.txt"

                    fs.appendFile(filePath, `${SteamUserID}|${interaction.channelId},\n`, err => {
                        if (err) throw err;

                        console.log("Done")
                    });

                    
                    try {
        
                        if (getFileDataFromDB) {
                            const fileFound = await drive.files.get({ fileId: getFileDataFromDB.FileId }).catch(err => console.log(err))
                            console.log(fileFound)
                            if (fileFound) {
                                const deleteResponse = await drive.files.delete({
                                    fileId: getFileDataFromDB.FileId
                                })
                                console.log(deleteResponse.data, deleteResponse.status)
                            } 
                            getFileDataFromDB.deleteOne();
                        }

                
        
                        const response = await drive.files.create({
                            requestBody: {
                                name: filePath,
                                mimeType: "text/plain"
                            },
                            media: {
                                mimeType: "text/plain",
                                body: fs.createReadStream(filePath)
                            }
                        })

                        console.log(response.data);

                        new fileData({
                            GuildId: interaction.guildId,
                            ChannelID: interaction.channelId,
                            FileId: response.data.id,
                            mimeType: response.data.mimeType,
                            FileName: response.data.name
                        }).save()
                
                    } catch (err) {
                        console.log(err)
                    }

                    await interaction.member.roles.add(VERIFIED_ROLE).catch(err => console.log(err));

                    const SuccessEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("You're all set!")
                    .setDescription("You have been verified!")

                    return inter.followUp({ embeds: [SuccessEmbed] });

                case "No_Button":
                    await inter.deferUpdate({ components: [] });

                    const CanceledEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Successfully Cancelled Process")
                    .setDescription("Run the command again with the desired Steam username.")

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
       } else if (EpicUserID) {
        const Embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Are you sure this is your Account ID?")
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

                    const filePath = "data.txt"

                    fs.appendFile(filePath, `${EpicUserID}|${interaction.channelId},\n`, err => {
                        if (err) throw err;

                        console.log("Done")
                    });

                    
                    try {

                        if (getFileDataFromDB) {
                            const fileFound = await drive.files.get({ fileId: getFileDataFromDB.FileId }).catch(err => console.log(err))

                            if (fileFound) {
                                const deleteResponse = await drive.files.delete({
                                    fileId: getFileDataFromDB.FileId
                                })
                                console.log(deleteResponse.data, deleteResponse.status)
                            }
                            getFileDataFromDB.deleteOne();
                        }

                
        
                        const response = await drive.files.create({
                            requestBody: {
                                name: filePath,
                                mimeType: "text/plain"
                            },
                            media: {
                                mimeType: "text/plain",
                                body: fs.createReadStream(filePath)
                            }
                        })

                        console.log(response.data);

                        new fileData({
                            GuildId: interaction.guildId,
                            ChannelID: interaction.channelId,
                            FileId: response.data.id,
                            mimeType: response.data.mimeType,
                            FileName: response.data.name
                        }).save()
                
                    } catch (err) {
                        console.log(err)

                        
                        const ErrorEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Error occurred")
                        .setDescription(err.message)

                        return inter.followUp({ embeds: [ErrorEmbed] });
                    }

                    await interaction.member.roles.add(VERIFIED_ROLE).catch(err => console.log(err));

                    const SuccessEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("You're all set!")
                    .setDescription("You have been verified!")

                    return inter.followUp({ embeds: [SuccessEmbed] });

                case "No_Button":
                    await inter.deferUpdate({ components: [] });

                    const CanceledEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Successfully Cancelled Process")
                    .setDescription("Run the command again with the desired Epic Games username.")

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