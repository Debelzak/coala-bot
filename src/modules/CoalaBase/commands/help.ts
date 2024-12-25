import { EmbedBuilder, Interaction as DiscordInteraction, SlashCommandBuilder } from "discord.js"
import { Interaction } from "../../../models/Interaction";
import os from "os"
import Worker from "../../../worker"

const builder = new SlashCommandBuilder()
    .setName("help")
    .setDescription("❓ Informações sobre o bot")

export default new Interaction({
    name: "help",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isCommand()) return;
        
        const version = Worker.getVersion();
        let availableCommands: string = "";
        for(const module of Worker.loadedModules) {
            availableCommands = availableCommands.concat(`\n[ Módulo: **${module.constructor.name} ] **\n`);
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