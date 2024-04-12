import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, Interaction, ComponentType } from "discord.js"
import PartyManager from "../../modules/partyManager";

export default {
    customId: "btn_transferPartyOwnership",
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
    
        if(thisParty.connectedUsers <= 1) {
            await interaction.reply({
                content: `Não há ninguém para transferir a liderança.`,
                ephemeral: true,
            });
            return;
        }
    
        const select = new StringSelectMenuBuilder()
            .setCustomId(interaction.id)
            .setPlaceholder('Selecione um participante')
            .setMaxValues(1)
            .setMinValues(1)
        
        for(const user of thisParty.currentParticipants) {
            if(user[1].id === interaction.user.id) continue;
    
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`@${user[1].displayName}`)
                    .setValue(user[1].id)
            );
        }
    
        const firstRow: any = new ActionRowBuilder()
            .addComponents(select);
    
        const reply = await interaction.reply({
            content: `Selecione um novo líder da Party`,
            components: [firstRow],
            fetchReply: true,
            ephemeral: true,
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector.on("collect", (newInteraction) => {
            interaction.deleteReply()
                .then(async() => {
                    const newLeaderId = newInteraction.values[0];
                    const newLeader = partyManager.TransferOwnership(newLeaderId, thisParty);
                    if(!newLeader) {
                        newInteraction.reply({content: `Não foi possível alterar o líder da party, o membro não está disponível.`, ephemeral: true});
                        return;
                    }
                    
                    partyManager.ReloadControlMessage(thisParty);
                    newInteraction.reply({content: `Liderança da party transferida.`, ephemeral: true})
                })
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
}