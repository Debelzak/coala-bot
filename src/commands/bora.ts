import { SlashCommandBuilder, SlashCommandUserOption } from "discord.js"

const thisCommand = new SlashCommandBuilder()
    .setName("bora")
    .setDescription("Chama um bora")
    .addUserOption(
        new SlashCommandUserOption()
            .setName("membro")
            .setDescription("Quem vai ser chamado no bora")
    )

export default thisCommand;