import { Interaction } from "discord.js"

export default {
    name: "bora",
    async run(interaction: Interaction): Promise<void> {
        if(!interaction.isCommand()) return;
        await interaction.reply({
            content: `:b:ora`,
            ephemeral: false,
        })
    }
}