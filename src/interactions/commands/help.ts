import { EmbedBuilder, Interaction, PermissionFlagsBits, PermissionResolvable } from "discord.js"
import os from "os"
import Util from "../../util/utils";
import * as commands from "../../commands"

export default {
    name: "help",
    async run(interaction: Interaction): Promise<void> {
        if(!interaction.isCommand()) return;

        const gitVersion: string = (await Util.getCommitHash()).substring(0, 7);
        const version: string = (gitVersion !== "null") ? `${gitVersion}-git` : "unknown";
        let availableCommands: string = "";
        for(const [key, command] of Object.entries(commands)) {
            const permissions = command.toJSON().default_member_permissions;
            availableCommands = availableCommands.concat(`**/${command.name}** : ${command.description} ${(permissions === "8") ? "**(admin apenas)**" : ""} \n`);
        }

        const embedMessage = new EmbedBuilder();
        embedMessage.setColor("#2B2D31");
        embedMessage.setTitle("Ajuda")
        embedMessage.setDescription(`\
**Comandos disponíveis** \n\
${availableCommands} \n\
**Debug Info** \n\
\`\`\`\
host(${os.hostname()}) build(${version}) \n\
guildid(${interaction.guildId}) \
apilatency(${Math.round(interaction.client.ws.ping)}ms)
\`\`\`\
        `)
    
        await interaction.reply({
                embeds: [embedMessage]
            }
        );
    }
}