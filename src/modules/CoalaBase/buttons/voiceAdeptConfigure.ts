import { ActionRowBuilder, ButtonBuilder, ButtonStyle, LabelBuilder, MessageFlags, ModalBuilder, RoleSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { Interaction } from "../../../models/Interaction.js";
import { CoalaBase } from "../../index.js";
import VoiceAdeptRole from "../models/VoiceAdeptRole.js";

const builder = new ButtonBuilder()
    .setCustomId("btn_voiceAdeptConfigure")
    .setEmoji("📝")
    .setLabel("Configurar")
    .setStyle(ButtonStyle.Primary)

export default new Interaction({
    name: "btn_voiceAdeptConfigure",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isButton()) return;
        if(!interaction.guild) return;

        const currentConfig = CoalaBase.voiceAdeptRoles.get(interaction.guild.id);

        const modal = new ModalBuilder()
            .setCustomId(interaction.id)
            .setTitle('Configurar cargo')

        const role = new RoleSelectMenuBuilder()
            .setCustomId("role")
        if(currentConfig)
            role.setDefaultRoles(currentConfig.roleId)

        const expirationDaysInput = new TextInputBuilder()
            .setCustomId("expiration_days")
            .setPlaceholder(`o cargo será removido ao não participar de chamadas de voz por x dias`)
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(4)
        if(currentConfig)
            expirationDaysInput.setValue(currentConfig.expirationDays.toString())

        const webhookURLInput = new TextInputBuilder()
            .setCustomId("webhook_url")
            .setPlaceholder(`Deixe vazio para desativar`)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(false)
        if(currentConfig?.announceWebhookURL)
            webhookURLInput.setValue(currentConfig.announceWebhookURL)

        const roleLabel = new LabelBuilder()
            .setLabel("Selecione o cargo")
            .setRoleSelectMenuComponent(role);

        const expirationLabel = new LabelBuilder()
            .setLabel("Dias para expiração")
            .setTextInputComponent(expirationDaysInput);

        const webhookLabel = new LabelBuilder()
            .setLabel("URL da webhook de anúncio")
            .setTextInputComponent(webhookURLInput);

        modal.addLabelComponents(roleLabel, expirationLabel, webhookLabel)

        await interaction.showModal(modal)
            .catch((error: Error) => console.log(error.message))

        // Process
        const submitted = await interaction.awaitModalSubmit({
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        }).catch((error: Error) => {return})

        if(submitted) {
            const reply = await submitted.deferReply({flags: MessageFlags.Ephemeral});

            // Validação de campos
            const roles = submitted.fields.getSelectedRoles("role");
            if(!roles || roles.size <= 0) return;

            const roleApi = roles.at(0);
            if(!roleApi) return;

            const role = interaction.guild.roles.cache.get(roleApi.id);
            if(!role) {
                await reply.edit(`Não foi possível localizar cargo`);
                return;
            }

            const expiration_days = submitted.fields.getTextInputValue("expiration_days");
            const expiration_days_int = parseInt(expiration_days);
            if(isNaN(expiration_days_int) || expiration_days_int < 1 || expiration_days_int > 9999) {
                await reply.edit(`Para "Dias para expiração", insira um dígito entre \`1\` e \`9999\`.`);
                return;
            }

            let webhook = null;
            const webhook_url = submitted.fields.getTextInputValue("webhook_url");
            const discordWebhookRegex = /^https:\/\/(ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
            if(webhook_url.length !== 0 && !discordWebhookRegex.test(webhook_url)) {
                await reply.edit(`O endereço de webhook inserido é inválido.`);
                return;
            } else {
                webhook = webhook_url;
            }

            // Processamento
            const newVoiceAdeptRole = new VoiceAdeptRole();
            newVoiceAdeptRole.guildId = interaction.guild.id;
            newVoiceAdeptRole.guildName = interaction.guild.name;
            newVoiceAdeptRole.roleId = role.id;
            newVoiceAdeptRole.roleName = role.name;
            newVoiceAdeptRole.expirationDays = expiration_days_int;
            newVoiceAdeptRole.announceWebhookURL = webhook;

            CoalaBase.voiceAdeptRoles.set( newVoiceAdeptRole.guildId, newVoiceAdeptRole);
            newVoiceAdeptRole.DB_Save();

            // Finalmente
            reply.delete();
            await interaction.followUp(`O cargo ${role} agora é atribuido aos membros que participarem de uma chamada de voz pelo período de 1h00. Após isso, o cargo poderá ser removido se o membro não participar de uma chamada de voz nos próximos ${expiration_days_int} dias.`);
        }
    }
})