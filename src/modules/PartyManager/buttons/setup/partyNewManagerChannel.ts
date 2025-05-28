import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ComponentType, EmbedBuilder, MessageFlags } from "discord.js"
import { Interaction } from "../../../../models/Interaction";
import PartyManager from "../../partyManager";

const builder = new ButtonBuilder()
    .setCustomId("btn_partyNewManagerChannel")
    .setEmoji("➕")
    .setLabel("Novo canal")
    .setStyle(ButtonStyle.Primary)

export default new Interaction({
    name: "btn_partyNewManagerChannel",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isButton()) return;

        const embed = new EmbedBuilder()
            .setTitle("Criar novo gerenciador de party")
            .setDescription("Defina um canal que irá ser gerenciador de parties")

		const select = new ChannelSelectMenuBuilder()
			.setCustomId(interaction.id)
			.setPlaceholder('Selecione um canal de voz')
            .setChannelTypes(ChannelType.GuildVoice)

        const row: any = new ActionRowBuilder()
            .addComponents(select);

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            withResponse: true,
            flags: MessageFlags.Ephemeral
        })
        
        const collector = reply.resource?.message?.createMessageComponentCollector({
            componentType: ComponentType.ChannelSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector?.on("collect", (newInteraction) => {
            interaction.deleteReply()
                .then(async() => {
                    await newInteraction.deferReply({flags: MessageFlags.Ephemeral});

                    const channelId = newInteraction.values[0];
                    const channel = interaction.client.channels.cache.get(channelId);

                    if(PartyManager.managerChannels.get(channelId)) {
                        return newInteraction.editReply({content: `O canal selecionado já é gerenciado por ${interaction.client.user}`});
                    }

                    PartyManager.newManagerChannel(channelId);

                    await newInteraction.deleteReply();

                    return await newInteraction.followUp({content: `O canal ${channel} agora é gerenciado por ${interaction.client.user}`});
                })
        });

        collector?.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})