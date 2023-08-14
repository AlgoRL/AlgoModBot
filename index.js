//#region Initialization
require("dotenv/config");
const fs = require('fs');
const axios = require('axios');

const { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

const { Guilds, GuildMembers, GuildMessages, MessageContent, DirectMessages } = GatewayIntentBits;
const { User, Message, GuildMember, Channel } = Partials;

const client = new Client({
    intents: [Guilds, GuildMembers, GuildMessages, MessageContent, DirectMessages],
    partials: [User, Message, GuildMember, Channel]
});


const { loadEvents } = require('./Functions/loadEvents');

loadEvents(client);

client.events = new Collection();
client.commands = new Collection();

client.login(process.env.TOKEN).then(() => {
    console.log("Logged in!")
})

const LogChannel = client.channels.fetch(process.env.LOG_CHANNEL);

//#endregion

//#region Detect patron unsub

client.on('guildMemberUpdate', (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const userID = newMember.id;

    const HadPatronRole = oldRoles.has(process.env.PATREON_ROLE)
    const HasPatronRole = newRoles.has(process.env.PATREON_ROLE)

    if (HadPatronRole) {
        if (HasPatronRole) {
            // all good
        }
        else {
            HandleRemove(userID, newMember);
        }
    }
});

client.on('guildMemberRemove', async (member) => {
    const userID = member.id;

    if (member.roles.cache.has(process.env.PATREON_ROLE)) {
        HandleRemove(userID, member);
    }
});
//#endregion

//#region Remove ID from Github

async function HandleRemove(content, member) {

    const roleToRemove = member.guild.roles.cache.get(process.env.VERIFIED_ROLE); // removes verified role
    await member.roles.remove(roleToRemove);

    const RawBotInfo = await cURLBotInfo();
    await RemoveFromGithub(content, RawBotInfo);
}

async function RemoveFromGithub(content, rawBot2) {
    console.log('Attempting to remove ' + content + " from github.");
    LogChannel.send("Attemping to remove " + content + " from github.");
    // define consts
    const owner = 'AlgoRL';
    const branch = 'main';
    const filePath = 'index.html';
    const githubToken = process.env.GITHUB_TOKEN;

    if (rawBot2 !== null) // null checks rawBot from cURL above
    {
        // === BOT | REMOVE MESSAGE CONTENT FROM GITHUB ===
        try {
            const repo = 'AlgoModBotInfo';

            const RemoveLineContaining = content;
            const CommitMessage = 'AlgoModBot: Removed line containing ' + RemoveLineContaining;

            // Get the content of the file
            const fileResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, {
                headers: {
                    Authorization: `token ${githubToken}`,
                },
            });

            const fileData = fileResponse.data;
            const fileContent = Buffer.from(fileData.content, 'base64').toString('utf-8');

            // Remove the line containing value
            const lines = fileContent.split('\n');
            const filteredLines = lines.filter((line) => !line.includes(RemoveLineContaining));
            const newFileContent = filteredLines.join('\n');

            // Update the file on the repository
            await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                message: CommitMessage,
                content: Buffer.from(newFileContent).toString('base64'),
                sha: fileData.sha,
                branch,
            }, {
                headers: {
                    Authorization: `token ${githubToken}`,
                },
            });
            console.log(CommitMessage);
            LogChannel.send('AlgoModBot: Removed BotInfo line containing ' + CommitMessage);
        } catch (error) {
            console.error('Error occurred:', error.message);
            LogChannel.send("Error removing from BotInfo: ", error);
        }

        // === IDS | REMOVE FROM GITHUB ===
        const infoSplit = rawBot2.split(',');
        let userInfo = null;

        for (const InfoPart of infoSplit) {
            if (InfoPart.trim().includes(content)) {
                userInfo = InfoPart.trim();
                break;
            }
        }

        if (userInfo !== null) {
            const UserInfoSplit = userInfo.split('|');
            const IDtoremove = UserInfoSplit[0];

            try {
                const repo1 = 'IDS';

                const CommitMessage2 = 'AlgoModBot: Removed line containing ' + IDtoremove;

                // Get the content of the file
                const fileResponse2 = await axios.get(`https://api.github.com/repos/${owner}/${repo1}/contents/${filePath}?ref=${branch}`, {
                    headers: {
                        Authorization: `token ${githubToken}`,
                    },
                });

                const fileData2 = fileResponse2.data;
                const fileContent2 = Buffer.from(fileData2.content, 'base64').toString('utf-8');

                // Remove the line containing value
                const lines2 = fileContent2.split('\n');
                const filteredLines2 = lines2.filter((line) => !line.includes(IDtoremove));
                const newFileContent2 = filteredLines2.join('\n');

                // Update the file on the repository
                await axios.put(`https://api.github.com/repos/${owner}/${repo1}/contents/${filePath}`, {
                    message: CommitMessage2,
                    content: Buffer.from(newFileContent2).toString('base64'),
                    sha: fileData2.sha,
                    branch,
                }, {
                    headers: {
                        Authorization: `token ${githubToken}`,
                    },
                });
                console.log(CommitMessage2);
                LogChannel.send('AlgoModBot: Removed IDS line containing ' + CommitMessage2);
            } catch (error) {
                console.error('Error occurred:', error.message);
                LogChannel.send('Error removing from IDS: ' + error);
            }

        }
        else {
            console.log('Did not find discord ID in rawBot');
        }
    }
    else {
        console.log('Error: rawBot == null');
        LogChannel.send('Cannot remove from rawBot, content == null');
    }
}

//#endregion

//#region cURL

async function cURLBotInfo() {
    console.log('cURL BOTINFO request starting.')
    const owner = 'AlgoRL';
    const branch = 'main';
    const filePath = 'index.html';
    const githubToken = process.env.GITHUB_TOKEN;
    const cURLrepo = 'AlgoModBotInfo';

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${cURLrepo}/contents/${filePath}?ref=${branch}`, {
            headers: {
                Authorization: `token ${githubToken}`,
            },
        });

        const fileData1 = response.data;
        const rawBotInfo = Buffer.from(fileData1.content, 'base64').toString('utf-8');
        return rawBotInfo;
    } catch (error) {
        LogChannel.send('Error BotInfo cURL: ' + error);
        throw new Error('Error cURL: ' + error.message);
    }
}

async function cURLIDS() {
    console.log('cURL IDS request starting.')
    const owner = 'AlgoRL';
    const branch = 'main';
    const filePath = 'index.html';
    const githubToken = process.env.GITHUB_TOKEN;
    const cURLrepo = 'IDS';

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${cURLrepo}/contents/${filePath}?ref=${branch}`, {
            headers: {
                Authorization: `token ${githubToken}`,
            },
        });

        const fileData1 = response.data;
        const rawIDS = Buffer.from(fileData1.content, 'base64').toString('utf-8');
        return rawIDS;
    } catch (error) {
        LogChannel.send('Error IDS cURL: ' + error);
        throw new Error('Error cURL: ' + error.message);
    }
}

async function cURLModInfo() {
    console.log('cURL MODINFO request starting.')
    const owner = 'AlgoRL';
    const branch = 'main';
    const filePath = 'index.html';
    const githubToken = process.env.GITHUB_TOKEN;
    const cURLrepo = 'ModInfo';

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${cURLrepo}/contents/${filePath}?ref=${branch}`, {
            headers: {
                Authorization: `token ${githubToken}`,
            },
        });

        const fileData1 = response.data;
        const rawModInfo = Buffer.from(fileData1.content, 'base64').toString('utf-8');
        return rawModInfo;
    } catch (error) {
        LogChannel.send('Error ModInfo cURL: ' + error);
        throw new Error('Error cURL: ' + error.message);
    }
}

//#endregion

//#region Mod selection

client.on('messageCreate', async message => {

    try {
    const LogChannel = await client.channels.fetch(process.env.LOG_CHANNEL);

    if (message.author.bot) 
    { 
        return; 
    }
    else
    {
        if (message.channel.id === process.env.VERIFY_CHANNEL) // checks to see if the message is in the verifying channel
        {
            const cleanInput = CleanInput(message.content); // cleans input
            const DiscordID = message.author.id;
            const userFileName = DiscordID + ".txt";

            if (cleanInput === "cancel") // allows users to cancel
            {
                fs.access(userFileName, fs.constants.F_OK, async (err) =>
                {
                    if (err)
                    {
                        message.reply("There is no verification in progress using your discord ID. Please message your Steam/Epic ID in this channel.")
                    }
                    else
                    {
                        fs.unlink(userFileName, err =>
                            {
                                if (err)
                                {
                                    message.reply("Error deleting your verification file. Please try again.")
                                    LogChannel.send("Error deleting file: " + userFileName);
                                }
                                else
                                {
                                    message.reply("Succesfully canceled verification.");
                                    LogChannel.send("Successfully canceled verification. Deleted file: " + userFileName);
                                }
                            });
                    }
                })
            }
            else
            { // continues with inputs    
            fs.access(userFileName, fs.constants.F_OK, async (err) => // checks to see if there is already a file for this user
            {
                if (err) {
                    
                    if (cleanInput.length === 17 || cleanInput.length === 32) { // checks if the input is the correct length
    
                        const RawBotInfo = await cURLBotInfo();
                        const RawIDS = await cURLIDS();
    
                        if (RawBotInfo.includes(DiscordID)) // checks to see if the message author's discord ID is already in AlgoModBotInfo
                        {
                            message.reply("Woah there, you're already verified!")
                        }
                        else {
                            if (RawIDS.includes(cleanInput)) { // checks to see if the user's input is already in IDS
                                message.reply("Woah there, this ID is already verified!")
                            }
                            else {
    
                                console.log('creating file with name ' + userFileName + cleanInput);
                                LogChannel.send("Creating input file for <@" + DiscordID + ">, named " + userFileName + ", containing " + cleanInput);
    
                                const fileContent3 = cleanInput + '|';
    
                                fs.writeFile(userFileName, fileContent3, (err) => { // creates file named the user's discord ID as the name, and thier inputed steam/epic ID inside.
                                    if (err) {
                                        console.error('Error creating file: ', err);
                                        LogChannel.send("Error creating file: ", err);
                                        return; // ends because err
                                    } else {
                                        CreateModOptions(message);
                                    }
                                });
                            }
                        }
                    }
                    else {
                        message.reply('Invalid ID input. Please message your Steam/Epic ID in this channel. How to find your ID: <#1062405855741481093>')
                    }
                }
                else {
                    // handles mod requests from users with a specified ID on file
                    const RawModInfo = await cURLModInfo();
                    const RawModSplit = RawModInfo.split(',');
    
                    const memberRoles = message.member.roles.cache;
                    const allRoles = memberRoles.map(role => role.id).join('.');
    
                    const userInput = message.content;
                    const CleanedInput = CleanInput(userInput);
    
                    // picking mods for tier 1
                    if (allRoles.includes(process.env.TIER1_ROLE)) {
                        for (const RawModPart of RawModSplit) {
                            const ModPartSplit = RawModPart.split('|');
                            const modID = CleanInput(ModPartSplit[0]); // gets ride of new line in mod name
    
                            if (CleanedInput.includes(modID)) {
                                const InputModRemoved = CleanedInput.replace(modID, '') // replaces the modID part of the input to see if there are extra mods.
                                if (InputModRemoved.length === 0) {
                                    const ModType = ModPartSplit[4];
    
                                    if (ModType === '0') {
                                        fs.readFile(userFileName, 'utf8', (err, data) => {
                                            if (err) {
                                                console.log("File doesn't exist!!!");
                                                return;
                                            }
                                            else {
                                                fs.unlink(userFileName, err => {
                                                    if (err) {
                                                        console.log("Error deleting file!");
                                                        LogChannel.send("Error deleting file: ", err);
                                                        return;
                                                    }
                                                    else {
                                                        const contentToAdd = data + "|" + modID + ",";
                                                        AddToGithubIDS(contentToAdd, message);
    
                                                        const memberRoles = message.member.roles.cache;
                                                        const allRoles = memberRoles.map(role => role.id).join('.');
                                                        const myData = `${data}|${message.author.username}|${message.member.id}|${message.author.avatar}|${allRoles},`;
    
                                                        AddToGithubBotInfo(myData);
                                                        return;
                                                    }
                                                });
                                            }
                                        });
    
                                        return;
                                    }
                                    else {
                                        message.reply("Woah there, **" + modID + "** is a Premium mod! Please choose a Basic mod.");
                                        return;
                                    }
                                }
                                else {
                                    message.reply("Woah there! Either you added more than 1 mod, or your input was invalid. Remember to use the bold text to request. Please try again.")
                                    return;
                                }
                            }
                        }
                    } 
                    else {
                        // picking mods for tier 2
                        if (allRoles.includes(process.env.TIER2_ROLE)) {
                            for (const RawModPart of RawModSplit) {
                                const ModPartSplit = RawModPart.split('|');
                                const modID = CleanInput(ModPartSplit[0]); // gets ride of new line in mod name
    
                                if (modID.length > 0)
                                {
                                    if (CleanedInput.includes(modID)) {
                                        const InputModRemoved = CleanedInput.replace(modID, '') // replaces the modID part of the input to see if there are extra mods.
                                        if (InputModRemoved.length === 0) {
                                            fs.readFile(userFileName, 'utf8', (err, data) => {
                                                if (err) {
                                                    console.log('Error reading file!');
                                                    LogChannel.send("Error reading file: ", err);
                                                    return;
                                                }
                                                else {
                                                        if (data.includes(modID))
                                                        {
                                                            message.reply('Woah there! You already have this mod!');
                                                        }
                                                        else
                                                        {
                                                            const ModType = ModPartSplit[4];
        
                                                            if (ModType === '0') {
                                                                // adds basic mod
                                                                const contentToAdd = modID + '_'
                                                                fs.appendFile(userFileName, contentToAdd, err => {
                                                                    if (err) {
                                                                        console.log('Error appending file: ', err);
                                                                        LogChannel.send("Error appending file: ", err);
                                                                    }
                                                                    else {
                                                                        message.reply("Basic mod added: **" + modID + "**.");
                                                                        Tier2Check(message, userFileName);
                                                                    }
                                                                });
                                                            }
                                                            else {
                                                                // ModType != 0 (add premium mod)
                                                                if (data.includes('PREMIUM')) {
                                                                    message.reply('Woah there! You already have a Premium mod selected. Please choose a Basic mod.')
                                                                    return;
                                                                }
                                                                else {
                                                                    const contentToAdd = modID + 'PREMIUM_'
                                                                    fs.appendFile(userFileName, contentToAdd, err => {
                                                                        if (err) {
                                                                            console.log('Error appending file: ', err);
                                                                            LogChannel.send("Error appending file: ", err);
                                                                        }
                                                                        else {
                                                                            message.reply("Premium mod added: **" + modID + "**.");
                                                                            LogChannel.send("Premium mod added: " + modID);
                                                                            Tier2Check(message, userFileName);
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        }
                                                }
                                            });
                                        }
                                        else {
                                            message.reply("Invalid input. Please message your pick of the bold options one at a time.", InputModRemoved);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }}
    }
} catch (err)
{
    LogChannel.send('Error with message verification: ' + err);
}
})

async function Tier2Check(message, file) {

    try {
    // checks to see if max mods has been reached
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) 
        { 
            console.log('Error reading file: ', err);
            LogChannel.send("Error reading file: ", err);
        } else {
            console.log(data);

                            // finds the num of mods
            const slicedData = data.slice(0, -1);
            const seperatedData = slicedData.split('|');
            const modsList = seperatedData[1].split('_');
            const numberOfMods = modsList.length;
            console.log('numberOfMods: ' +numberOfMods);

            // if the number of mods is the max for tier 2, verify
            if (numberOfMods === 3) {
                // removes 'PREMIUM' text added in
                const VerifyContent = slicedData.replace('PREMIUM', ''); 
                    const fullVerification = VerifyContent + ',';
                    console.log(fullVerification);
                    fs.unlink(file, err => {
                        if (err) { console.log('Error deleting file: ', err); LogChannel.send("Error deleting file: ", err); } else {
                            AddToGithubIDS(fullVerification, message);

                            const memberRoles = message.member.roles.cache;
                            const allRoles = memberRoles.map(role => role.id).join('.');
                            const myData = `${data}|${message.author.username}|${message.member.id}|${message.author.avatar}|${allRoles},`;

                            AddToGithubBotInfo(myData);
                        }
                    });
            }
        }
    });
}
catch (err)
{
    LogChannel.send('Error with Tier 2 check: ' + err);
}
}

async function CreateModOptions(message) // if thier tier is 3 or X, automatically verifies.
{
    const memberRoles = message.member.roles.cache;
    const allRoles = memberRoles.map(role => role.id).join('.');

    const RawModInfo = await cURLModInfo();

    if (allRoles.includes(process.env.TIER1_ROLE)) {
        // tier 1 :3
        ShowModOptions('1', RawModInfo);
    } else {
        if (allRoles.includes(process.env.TIER2_ROLE)) {
            // tier 2 :3
            ShowModOptions('2', RawModInfo);
        } else {
            if (allRoles.includes(process.env.TIER3_ROLE)) {
                // tier 3
                VerifyTier3X(message, RawModInfo);
                return;
            } else {
                if (allRoles.includes(process.env.TIERX_ROLE)) {
                    // tier X
                    VerifyTier3X(message, RawModInfo);
                    return;
                } else {
                    console.log('User has no tier role');
                }
            }
        }
    }
}

async function ShowModOptions(tier, RawModInfo) {

    try {
    const verifyChannel = client.channels.cache.get(process.env.VERIFY_CHANNEL);
    const splitRawMod = RawModInfo.split(',');
    let ModMessage = "__See full mod list here -> <#1049770353385275392>__\n";

    for (const ModPart of splitRawMod) {
        const ModPartClean = CleanInput(ModPart);
        if (ModPartClean.length > 0) // removes empty spaces
        {
            const splitModPart = ModPart.split('|');
            if (splitModPart[4] === '0') // 0 = basic mod
            {
                const modID2 = splitModPart[0].replace(/[\r\n]/g, ''); // gets ride of new line in mod name
                const modmessage = ":star: **" + modID2 + "** = " + splitModPart[1] + ". See this mod here -> <" + splitModPart[5] + ">\n";
                ModMessage = ModMessage + modmessage;
            }
            else {
                if (tier === '2') {
                    const modID = splitModPart[0].replace(/[\r\n]/g, ''); // gets ride of new line in mod name
                    const modmessage2 = ":star2: **" + modID + "** = " + splitModPart[1] + ". See this mod here -> <" + splitModPart[5] + ">\n";
                    ModMessage = ModMessage + modmessage2;
                }
            }
        }
    }

    verifyChannel.send(ModMessage);

    if (tier === '1') {
        const ModEmbed = new EmbedBuilder()
            .setTitle("Now pick your mods")
            .setDescription("Message the mod that you want. You are **Tier 1**. You get __1 Basic mod__.")

        verifyChannel.send({ embeds: [ModEmbed] });
    }
    else {
        const ModEmbed = new EmbedBuilder()
            .setTitle("Now pick your mods")
            .setDescription("Message the mods that you want __one at a time__. You are **Tier 2**. You get __1 Premium mod__ and __2 Basic mods__. :star: = Basic and :star2: = Premium")

        verifyChannel.send({ embeds: [ModEmbed] });
    }
} catch (err)
{
    LogChannel.send('Error with show mod options: ' + err);
}
}

async function VerifyTier3X(message, RawModInfo) {
    let ModList = "all";

    try {
        const splitRawMod = RawModInfo.split(',');
        for (const ModPart of splitRawMod) {
            const splitModPart = ModPart.split('|');
            if (splitModPart[0].length > 0) {
                ModList += "_" + splitModPart[0];
            }
        }

        ModList = ModList.replace(/[\r\n]/g, ''); // removes extranious lines
        if (ModList.endsWith('_')) { ModList = ModList.slice(0, -1); } // removes underscore at the end of the string if it exists

        try {
            const DiscordID = message.author.id;
            const userFileName = DiscordID + ".txt";

            fs.readFile(userFileName, 'utf8', (err, data) => {
                if (err) { console.log("File doesn't exist!!!") }
                else {
                    const fullVerification = data + ModList + ","
                    console.log(fullVerification);
                    fs.unlink(userFileName, err => {
                        if (err) {
                            console.log("Error deleting file: ", err);
                            LogChannel.send("Error deleting file: ", err);
                        } else {
                            AddToGithubIDS(fullVerification, message);

                            const memberRoles = message.member.roles.cache;
                            const allRoles = memberRoles.map(role => role.id).join('.');
                            const myData = `${data}|${message.author.username}|${message.member.id}|${message.author.avatar}|${allRoles},`;

                            AddToGithubBotInfo(myData);
                        }
                    });
                }
            });
        } catch (err) {
            console.log("Error reading file: " + err);
            LogChannel.send("Error reading file: ", err);
        }
    } catch (err) {
        console.log("Error handling verify tier 3x: ", err);
        LogChannel.send("Error handling verify tier 3x: ", err);
    }
}

async function AddToGithubIDS(content, message) {
    try {
        const authToken = process.env.GITHUB_TOKEN;
        const owner = 'AlgoRL';
        const repo = 'IDS';
        const filePath = 'index.html';
        const contentToAdd = content;

        // gives verified role
        await message.member.roles.add(process.env.VERIFIED_ROLE).catch(err => LogChannel.send("Error adding verified role: ", err));
        console.log("given verified role");

        // Get the current file content and SHA hash
        axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            }
        )
            .then(response => {
                const currentContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
                const currentSha = response.data.sha;

                // Check if the current content ends with \n
                const shouldAddNewline = !currentContent.endsWith('\n');

                // Append the new content to the existing content with or without a new line
                const combinedContent = shouldAddNewline
                    ? currentContent + '\n' + contentToAdd
                    : currentContent + contentToAdd;

                const encodedCombinedContent = Buffer.from(combinedContent).toString('base64');

                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

                axios.put(
                    url,
                    {
                        message: 'Add content to file via API', // Update the commit message
                        content: encodedCombinedContent,
                        sha: currentSha, // Provide the SHA hash of the current content
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                        },
                    }
                )
                    .then(response => {
                        console.log('File content updated successfully:');
                        message.reply("Your verification complete! Please wait 60 seconds before using your mods.")
                        LogChannel.send("Content added to IDS: " + contentToAdd);
                    })
                    .catch(error => {
                        console.error('Error updating file content:', error);
                        LogChannel.send("Error updating file content: ", err);
                    });
            })
            .catch(error => {
                console.error('Error fetching current file content:', error);
                LogChannel.send("Error fetching current github file content: ", err);
            });
    } catch (err) {
        console.log("Error adding to IDS: ", err);
        LogChannel.send("Error adding to IDS: ", err);
    }
}

async function AddToGithubBotInfo(content) {
    try {
        const authToken = process.env.GITHUB_TOKEN;
        const owner = 'AlgoRL';
        const repo = 'AlgoModBotInfo';
        const filePath = 'index.html';
        const contentToAdd = content;

        // Get the current file content and SHA hash
        axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            }
        )
            .then(response => {
                const currentContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
                const currentSha = response.data.sha;

                // Check if the current content ends with \n
                const shouldAddNewline = !currentContent.endsWith('\n');

                // Append the new content to the existing content with or without a new line
                const combinedContent = shouldAddNewline
                    ? currentContent + '\n' + contentToAdd
                    : currentContent + contentToAdd;

                const encodedCombinedContent = Buffer.from(combinedContent).toString('base64');

                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

                axios.put(
                    url,
                    {
                        message: 'Add content to file via API', // Update the commit message
                        content: encodedCombinedContent,
                        sha: currentSha, // Provide the SHA hash of the current content
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                        },
                    }
                )
                    .then(response => {
                        console.log('Line added to Github BotInfo');
                        LogChannel.send("Content added to BotInfo: " + contentToAdd);
                    })
                    .catch(error => {
                        console.error('Error updating file content:', error);
                        LogChannel.send("Error updating file content: ", err);
                    });
            })
            .catch(error => {
                console.error('Error fetching current file content:', error);
                LogChannel.send("Error fetching current file content: ", err);
            });
    } catch (err) {
        console.log("Error adding to botinfo: ", err);
        LogChannel.send("Error adding to botinfo: ", err);
    }
}

function CleanInput(input) {
    const inputID = input;
    try {
        if (inputID.includes('Steam ID:')) {
            const clean = inputID.replace("Steam ID:", "");
            const clean1 = clean.replace(/[^a-zA-Z0-9]/g, ""); // replaces everything but numbers and letters
            const clean2 = clean1.replace(/[\r\n]/g, ''); // replaces all extranious lines
            const clean3 = clean2.toLowerCase();
            return clean3;
        }
        else {
            if (inputID.includes('ID:')) {
                const clean = inputID.replace("ID:", "");
                const clean1 = clean.replace(/[^a-zA-Z0-9]/g, ""); // replaces everything but numbers and letters
                const clean2 = clean1.replace(/[\r\n]/g, ''); // replaces all extranious lines
                const clean3 = clean2.toLowerCase();
                return clean3;
            }
            else {
                const clean1 = inputID.replace(/[^a-zA-Z0-9]/g, ""); // replaces everything but numbers and letters
                const clean2 = clean1.replace(/[\r\n]/g, ''); // replaces all extranious lines
                const clean3 = clean2.toLowerCase();
                return clean3;
            }
        }
    }
    catch (err) {
        console.log('Error cleaning input: ', err);
        LogChannel.send("Error cleaning input: ", err);
    }
}

//#endregion
