import { ActionRowBuilder, UserSelectMenuBuilder, ComponentType, GuildMember, PermissionsBitField, ButtonBuilder, ButtonStyle } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction } from "../../../models/Interaction";

const builder = new ButtonBuilder()
    .setCustomId("btn_banPartyMembers")
    .setLabel("Banir Membro")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("➖");

export default new Interaction({
    name: "btn_banPartyMembers",
    builder: builder,
    async run(interaction) {
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
                        return newInteraction.reply({content: "Não é possível banir administradores.", ephemeral: true});
                    }

                    if(thisParty.ownerId === memberId || newInteraction.user.id === memberId) {
                        return newInteraction.reply({content: "Não é possível banir o líder da party e/ou banir a sí.", ephemeral: true});
                    }
                }
                
                await newInteraction.deferReply();
                const bannedMembers: GuildMember[] = await PartyManager.BanMembers(membersToBan, thisParty);
                let reply: string = `Os seguintes membros foram proibidos de participar desta party:`;
                for(const member of bannedMembers) {
                    reply = reply.concat(` ${member}`);
                }
                reply = reply.concat(".");
                PartyManager.ReloadControlMessage(thisParty);
                
                newInteraction.editReply(reply);
            })
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})