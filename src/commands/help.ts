import { SlashCommandBuilder } from "discord.js"

const thisCommand = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Informações sobre o bot")

export default thisCommand;