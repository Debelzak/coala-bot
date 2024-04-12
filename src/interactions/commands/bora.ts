import { GuildMember, Interaction } from "discord.js"

export default {
    name: "bora",
    async run(interaction: Interaction): Promise<void> {
        if(!interaction.isCommand()) return;
        const membro = interaction.options.get("membro")?.member;
        await interaction.reply({
            content: `:b:ora ${(membro) ? membro : ""}`,
            ephemeral: false,
        })
    }
}