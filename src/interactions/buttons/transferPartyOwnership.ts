import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, Interaction, ComponentType } from "discord.js"
import PartyManager from "../../modules/partyManager";

export default {
    customId: "btn_transferPartyOwnership",
    async run(interaction: Interaction) {
        if(!interaction.isButton()) return;
        const thisParty = (interaction.channelId) ? PartyManager.parties.get(interaction.channelId) : undefined;
    
        // Check if party was found
        if(!thisParty) throw new Error("Erro desconhecido");
    
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
        
        for(const user of thisParty.participants) {
            if(user.id === interaction.user.id) continue;
    
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`@${user.displayName}`)
                    .setValue(user.id)
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
            .then(() => newInteraction.reply(`Novo líder da party agora é ${newInteraction.values[0]}`))
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
}