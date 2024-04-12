import { Interaction } from "discord.js"

export default {
    name: "setup",
    async run(interaction: Interaction): Promise<void> {
        if(!interaction.isCommand()) return;
        await interaction.reply("Falta implementação.");
    }
}