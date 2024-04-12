import { ActionRowBuilder, UserSelectMenuBuilder, Interaction, ComponentType, GuildMember, PermissionsBitField } from "discord.js"
import PartyManager from "../../modules/partyManager";

export default {
    customId: "btn_banPartyMembers",
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
            content: `Selecione membros do servidor para proibir a entrada`,
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
                
                const membersToBan = newInteraction.values;
                for(const memberId of membersToBan) {
                    if(newInteraction.guild?.members.cache.get(memberId)?.permissionsIn(newInteraction.channelId).has(PermissionsBitField.Flags.Administrator))
                    {
                        newInteraction.reply({content: "Não é possível banir administradores.", ephemeral: true});
                        return;
                    }

                    if(thisParty.ownerId === memberId || newInteraction.user.id === memberId) {
                        newInteraction.reply({content: "Não é possível banir o líder da party e/ou banir a sí.", ephemeral: true});
                        return;
                    }
                }
                
                await newInteraction.deferReply();
                const bannedMembers: GuildMember[] = await partyManager.BanMembers(membersToBan, thisParty);
                let reply: string = `Os seguintes membros foram proibidos de participar desta party:`;
                for(const member of bannedMembers) {
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