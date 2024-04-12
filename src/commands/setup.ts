import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

const thisCommand = new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Define configurações e módulos")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export default thisCommand;