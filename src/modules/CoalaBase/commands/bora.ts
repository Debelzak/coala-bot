import { Interaction as DiscordInteraction, SlashCommandBuilder, SlashCommandUserOption } from "discord.js"
import { Interaction, InteractionType } from "../../../models/Interaction";

const builder = new SlashCommandBuilder()
    .setName("bora")
    .setDescription("Chama um bora")
    .addUserOption(
        new SlashCommandUserOption()
            .setName("membro")
            .setDescription("Quem vai ser chamado no bora")
    )

export default new Interaction({
    type: InteractionType.COMMAND,
    customId: "bora",
    commandBuilder: builder,
    async run(interaction: DiscordInteraction): Promise<void> {
        if(!interaction.isCommand()) return;
        const membro = interaction.options.get("membro")?.member;
        await interaction.reply({
            content: `:b:ora ${(membro) ? membro : ""}`,
            ephemeral: false,
        })
    }
})