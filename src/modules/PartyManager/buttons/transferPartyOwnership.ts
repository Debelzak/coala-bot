import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ButtonBuilder, ButtonStyle, GuildMember } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction } from "../../../models/Interaction";

const builder = new ButtonBuilder()
    .setLabel("Alterar Líder")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("👑")
    .setCustomId("btn_transferPartyOwnership")

export default new Interaction({
    name: "btn_transferPartyOwnership",
    builder: builder,
    async run(interaction) {
        if(!interaction.isButton()) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const thisParty = await PartyManager.GetPartyByMember(interaction.member);

        if(!thisParty) {
            await interaction.reply({
                content: "Você não é líder de nenhuma party no momento.",
                ephemeral: true
            })
            return;
        }

        if(thisParty.ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "Apenas o líder da party pode realizar esta ação.",
                ephemeral: true
            })
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
                    .setLabel(`@${ (user[1].nickname !== null) ? user[1].nickname : user[1].displayName }`)
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
                    const newLeader = PartyManager.TransferOwnership(newLeaderId, thisParty);
                    if(!newLeader) {
                        return newInteraction.reply({content: `Não foi possível alterar o líder da party, o membro não está disponível.`, ephemeral: true});
                    }
                    
                    PartyManager.ReloadControlMessage(thisParty);
                    newInteraction.reply({
                        content: `Liderança da party transferida.`,
                        ephemeral: true
                    })
                })
                .catch((error) => {
                    return;
                })
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})