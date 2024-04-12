import { ActionRowBuilder, UserSelectMenuBuilder, Interaction, ComponentType, GuildMember } from "discord.js"
import PartyManager from "../../modules/partyManager";

export default {
    customId: "btn_allowPartyMembers",
    async run(interaction: Interaction) {
        if(!interaction.isButton()) return;
        const thisParty = (interaction.channelId) ? PartyManager.parties.get(interaction.channelId) : undefined;
    
        // Check if party was found
        if(!thisParty) return;
    
        const partyManager: PartyManager = new PartyManager(interaction.client);
        const isPartyOwner = await partyManager.CheckOwnership(interaction.user, thisParty, interaction);
        if(!isPartyOwner) {
            return;
        }
    
        const select = new UserSelectMenuBuilder()
            .setCustomId(interaction.id)
            .setPlaceholder('Selecione até 10 membros por vez')
            .setMinValues(1)
            .setMaxValues(10)

        const firstRow: any = new ActionRowBuilder()
            .addComponents(select);
    
        const reply = await interaction.reply({
            content: `Selecione membros do servidor para permitir a entrada`,
            components: [firstRow],
            fetchReply: true,
            ephemeral: true,
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.UserSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector.on("collect", (newInteraction) => {
            interaction.deleteReply().then(async() => {
                
                const membersToAllow = newInteraction.values;
                for(const memberId of membersToAllow) {
                    if(newInteraction.user.id === memberId) {
                        newInteraction.reply({content: "Não é possível permitir a sí próprio(a).", ephemeral: true});
                        return;
                    }
                }
                
                await newInteraction.deferReply();
                const allowedMembers: GuildMember[] = await partyManager.AllowMembers(membersToAllow, thisParty);
                let reply: string = `Os seguintes membros agora podem participar desta party:`;
                for(const member of allowedMembers) {
                    reply = reply.concat(` ${member}`);
                }
                reply = reply.concat(".");
                partyManager.ReloadControlMessage(thisParty);
                newInteraction.editReply(reply);
            })
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
}