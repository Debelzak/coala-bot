import { Interaction as DiscordInteraction, SlashCommandBuilder, SlashCommandUserOption } from "discord.js"
import { Interaction } from "../../../models/Interaction.js";

const builder = new SlashCommandBuilder()
    .setName("bora")
    .setDescription("🅱️ Chama um bora")
    .addUserOption(
        new SlashCommandUserOption()
            .setName("membro")
            .setDescription("Quem vai ser chamado no bora")
    )

export default new Interaction({
    name: "bora",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isCommand()) return;
        if(!interaction.isChatInputCommand()) return;

        const membro = interaction.options.get("membro")?.member;
        await interaction.reply({
            content: `:b:ora ${(membro) ? membro : ""}`
        })
    }
})