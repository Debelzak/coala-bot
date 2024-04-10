import { EmbedBuilder, Interaction } from "discord.js"
import * as commands from "../../commands"
import os from "os"

export default {
    name: "help",
    async run(interaction: Interaction): Promise<void> {
        if(!interaction.isCommand()) return;

        const embedMessage = new EmbedBuilder();
        embedMessage.setTitle("Comandos disponíveis")
        for(const [key, value] of Object.entries(commands)) {
            embedMessage.addFields(
                { name: `${value.name}`, value: `${value.description}`, inline: false},
            )
        }

        const pkg = require("../../../package.json");
        embedMessage.addFields(
            { name: `Debug info`, value: `\`\`\`\nversion(${pkg.version}) host(${os.hostname()})\nhash(a0902384ldj)\n\`\`\``}
        )
    
        await interaction.reply({
                embeds: [embedMessage]
            }
        );
    }
}