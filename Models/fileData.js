const mongoose = require("mongoose");

module.exports = mongoose.model("fileData", new mongoose.Schema({
    GuildId: String,
    ChannelID: String,
    FileId: String,
    mimeType: String,
    FileName: String
}));