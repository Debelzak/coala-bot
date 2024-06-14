import { EmbedBuilder, Interaction as DiscordInteraction, SlashCommandBuilder } from "discord.js"
import { Interaction, InteractionType } from "../../../models/Interaction";
import os from "os"
import Util from "../../../util/utils";
import Worker from "../../../worker"

const builder = new SlashCommandBuilder()
    .setName("help")
    .setDescription("❓ Informações sobre o bot")


export default new Interaction({
    type: InteractionType.COMMAND,
    customId: "help",
    commandBuilder: builder,
    async run(interaction: DiscordInteraction): Promise<void> {
        if(!interaction.isCommand()) return;

        const gitVersion: string = (await Util.getCommitHash()).substring(0, 7);
        const version: string = (gitVersion !== "null") ? `${gitVersion}-git` : "unknown";
        let availableCommands: string = "";
        for(const module of Worker.loadedModules) {
            for(const [key, interaction] of module.interactions) {
                if(interaction.type !== InteractionType.COMMAND || !interaction.commandBuilder) continue;
                const command = interaction.commandBuilder;
                const permissions = command.toJSON().default_member_permissions;
                availableCommands = availableCommands.concat(`**/${command.name}** : ${command.description} ${(permissions === "8") ? "**[admin]**" : ""} \n`);
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