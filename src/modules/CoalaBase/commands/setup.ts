import { Interaction as DiscordInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Interaction, InteractionType } from "../../../models/Interaction";

const builder = new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Define configurações e módulos")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export default new Interaction({
    type: InteractionType.COMMAND,
    customId: "setup",
    commandBuilder: builder,
    async run(interaction: DiscordInteraction): Promise<void> {
        if(!interaction.isCommand()) return;
        await interaction.reply("Falta implementação.");
    }
})