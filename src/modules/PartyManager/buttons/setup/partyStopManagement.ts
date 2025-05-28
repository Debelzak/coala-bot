import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Interaction as DiscordInteraction, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js"
import { Interaction } from "../../../../models/Interaction";
import PartyManager from "../../partyManager";

const builder = new ButtonBuilder()
    .setCustomId("btn_partyStopManagement")
    .setEmoji("➖")
    .setLabel("Parar gerenciamento")
    .setStyle(ButtonStyle.Danger)

export default new Interaction({
    name: "btn_partyStopManagement",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isButton()) return;
        const reply = await interaction.deferReply({
            withResponse: true,
            flags: MessageFlags.Ephemeral
        })

        const embed = new EmbedBuilder()
            .setTitle("Parar de gerenciar canal")
            .setDescription("Defina canal que irá parar agir como gerenciador de parties.")

		const select = new StringSelectMenuBuilder()
			.setCustomId(interaction.id)
			.setPlaceholder('Selecione o gerenciador de party')

        const guildChannels = await interaction.guild?.channels.fetch();
        if(guildChannels) {
            for(const [key, channel] of guildChannels) {
                if(!channel?.isVoiceBased()) continue;
                if(!PartyManager.managerChannels.get(channel.id)) continue;

                const label = (channel.parent) ? `${channel.parent?.name} > ${channel.name}` : `${channel.name}`
                select.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(label)
                        .setValue(channel.id)
                )
            }
        }

        if(select.options.length <= 0) {
            await interaction.editReply(`Este servidor ainda não possui nenhum canal sendo gerenciado por ${interaction.client.user}.`)
            return;
        }

        const row: any = new ActionRowBuilder()
            .addComponents(select);

        await interaction.editReply({
            embeds: [embed],
            components: [row],
        })

        const collector = reply.resource?.message?.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector?.on("collect", (newInteraction) => {
            interaction.deleteReply()
                .then(async() => {
                    await newInteraction.deferReply({flags: MessageFlags.Ephemeral});

                    const channelId = newInteraction.values[0];
                    const channel = interaction.client.channels.cache.get(channelId);

                    PartyManager.removeManagerChannel(channelId);

                    await newInteraction.deleteReply();

                    return await newInteraction.followUp({content: `O canal ${channel} deixou de ser gerenciado por ${interaction.client.user}`});
                })
        });

        collector?.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})