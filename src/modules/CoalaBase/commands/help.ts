import { EmbedBuilder, Interaction as DiscordInteraction, SlashCommandBuilder } from "discord.js"
import { Interaction } from "../../../models/Interaction";
import os from "os"
import Util from "../../../util/utils";
import Worker from "../../../worker"

const builder = new SlashCommandBuilder()
    .setName("help")
    .setDescription("❓ Informações sobre o bot")

export default new Interaction({
    name: "help",
    builder: builder,
    async run(interaction): Promise<void> {
        const gitVersion: string = (await Util.getCommitHash()).substring(0, 7);
        const version: string = (gitVersion !== "null") ? `${gitVersion}-git` : "unknown";
        let availableCommands: string = "";
        for(const module of Worker.loadedModules) {
            for(const [key, interaction] of module.interactions) {
                if(interaction.isCommand()){
                    const command = interaction.builder;
                    const permissions = command.default_member_permissions;
                    availableCommands = availableCommands.concat(`**/${command.name}** : ${command.description} ${(permissions === "8") ? "**[admin]**" : ""} \n`);
                }
            }
        }

        const embedMessage = new EmbedBuilder();
        embedMessage.setColor("#2B2D31");
        embedMessage.setTitle("Ajuda")
        embedMessage.setDescription(`\
**Comandos disponíveis** \n\
${availableCommands} \n\
**Debug Info** \n\
\`\`\`\
host(${os.hostname()}) version(${version}) \n\
guildid(${interaction.guildId}) \
apilatency(${Math.round(interaction.client.ws.ping)}ms)
\`\`\`\
        `)
    
        await interaction.reply({
                embeds: [embedMessage]
            }
        );
    }
})