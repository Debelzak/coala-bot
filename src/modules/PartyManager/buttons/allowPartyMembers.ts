import { ActionRowBuilder, UserSelectMenuBuilder, ComponentType, GuildMember, ButtonBuilder, ButtonStyle, Message, MessageFlags } from "discord.js"
import PartyManager from "../partyManager.js";
import { Interaction } from "../../../models/Interaction.js";

const builder = new ButtonBuilder()
    .setCustomId("btn_allowPartyMembers")
    .setLabel("Permitir Membro")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

export default new Interaction({
    name: "btn_allowPartyMembers",
    builder: builder,
    async run(interaction) {
        if(!interaction.isButton()) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const thisParty = await PartyManager.GetPartyByMember(interaction.member);

        if(!thisParty) {
            await interaction.reply({
                content: "Você não é líder de nenhuma party no momento.",
                flags: MessageFlags.Ephemeral
            })
            return;
        }

        if(thisParty.ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "Apenas o líder da party pode realizar esta ação.",
                flags: MessageFlags.Ephemeral
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
            content: `Selecione membros do servidor para permitir a entrada`,
            components: [firstRow],
            withResponse: true,
            flags: MessageFlags.Ephemeral,
        });

        const collector = reply.resource?.message?.createMessageComponentCollector({
            componentType: ComponentType.UserSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector?.on("collect", (newInteraction) => {
            interaction.deleteReply()
                .then(async() => {
                    
                    const membersToAllow = newInteraction.values;
                    for(const memberId of membersToAllow) {
                        if(newInteraction.user.id === memberId) {
                            return newInteraction.reply({content: "Não é possível permitir a sí próprio(a).", flags: MessageFlags.Ephemeral});
                        }
                    }
                    
                    await newInteraction.deferReply();
                    const allowedMembers: GuildMember[] = await PartyManager.AllowMembers(membersToAllow, thisParty);
                    let reply: string = `Os seguintes membros agora podem participar desta party:`;
                    for(const member of allowedMembers) {
                        reply = reply.concat(` ${member}`);
                    }
                    reply = reply.concat(".");
                    PartyManager.ReloadControlMessage(thisParty);
                    newInteraction.editReply(reply);
                })
        });

        collector?.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})