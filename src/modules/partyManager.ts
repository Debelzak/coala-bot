import { Client, GuildMember, ButtonInteraction, VoiceBasedChannel, BaseMessageOptions, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalSubmitInteraction, User, Channel } from "discord.js"
import Party from "../models/party";
import Util from "../util/utils";
import Module from "../models/module";

class PartyManager extends Module {
    public static readonly parties: Map<string, Party> = new Map<string, Party>();
    public static readonly managedChannels: Map<string, VoiceBasedChannel> = new Map<string, VoiceBasedChannel>();

    constructor(client: Client) {
        super(client);
    }

    init(): void {
        super.init();
        this.initPartyManagement();
    }

    private buildChannelCache() {
        if(process.env.MANAGED_CHANNELS) {
            const channelIdList: string[] = process.env.MANAGED_CHANNELS.split(" ");
            for(const channelId of channelIdList) {
                const channel: Channel | undefined = this.client.channels.cache.get(channelId);
                if(channel?.isVoiceBased()) { 
                    PartyManager.managedChannels.set(channel.id, channel);
                    this.logger.success(`Gerenciando canal de voz [${channel.name}] no servidor [${channel.guild.name}]`);
                } else {
                    this.logger.warning(`Canal de voz [${channelId}] não encontrado. Ignorando.`)
                    continue;
                }
            }
        }
    }

    private buildPartyCache() {
        // TODO: Necessário para manter registro de parties antigas no caso do programa ser reiniciado ou crashar.
    }

    private initPartyManagement(): void {
        this.buildChannelCache();
        this.buildPartyCache();

        this.client.on('voiceStateUpdate', async (oldVoiceState, newVoiceState) => {
            // Se um membro se conectou/desconectou a um canal.
            if (newVoiceState.channel !== oldVoiceState.channel) {
                if(!newVoiceState.member) return;
                const member: GuildMember = newVoiceState.member;
                const userName: string = member.user.displayName;
                const partyDefaultName: string = `🚪Party de ${userName}`;

                const partyEntered: Party | undefined = (newVoiceState.channelId) ? PartyManager.parties.get(newVoiceState.channelId) : undefined;
                const partyExited: Party | undefined = (oldVoiceState.channelId) ? PartyManager.parties.get(oldVoiceState.channelId) : undefined;

                if(newVoiceState.channel && PartyManager.managedChannels.get(newVoiceState.channel.id)) { // Se o canal é gerenciado pelo bot.
                    try {
                        await this.CreateParty(member, partyDefaultName, newVoiceState.channel);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }

                if(partyEntered) { // Se conectou a alguma party
                    try {
                        await partyEntered.addUser(member);
                        this.logger.success(`${userName} entrou na party [${partyEntered.voiceChannel.name}]. ${partyEntered.connectedUsers} usuários restantes.`);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
                else if(partyExited) { // Se desconectou de alguma party
                    try {
                        await partyExited.removeUser(member);
                        this.logger.success(`${userName} saiu da party [${partyExited.voiceChannel.name}]. ${partyExited.connectedUsers} usuários restantes.`);
                        
                        // Remove party do cache se estiver vazia.
                        if(partyExited.connectedUsers <= 0) {
                            this.logger.success(`Nenhum membro restante em [${partyExited.voiceChannel.name}], excluindo...`);
                            PartyManager.parties.delete(partyExited.voiceChannel.id);
                        }
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
            }
        })
    }

    private controlMessage(party: Party): BaseMessageOptions {
        const embedMessage = new EmbedBuilder()
            .setColor(0x0099FF)
            .addFields(
                { name: 'Canal', value: `${party.voiceChannel}`, inline: false},
                { name: 'Privacidade', value: `${(party.isPrivate) ? `Privada` : `Pública`}`, inline: false},
                { name: 'Líder', value: `${this.client.users.cache.get(party.ownerId)}`, inline: false},
            )

        // Define botões e dados vinculados a eles.
        const renameParty = new ButtonBuilder()
            .setLabel("Renomear")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📝")
            .setCustomId("btn_renameParty")
    
        const transferPartyOwnership = new ButtonBuilder()
            .setLabel("Transferir Líder")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("👑")
            .setCustomId("btn_transferPartyOwnership")

        const togglePrivacy = new ButtonBuilder()
            .setLabel(`${(party.isPrivate) ? "Tornar Pública" : "Tornar Privada"}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(`${(party.isPrivate) ? "🔓" : "🔒"}`)
            .setCustomId("btn_togglePartyPrivacy")

        const kickMember = new ButtonBuilder()
            .setCustomId("tt/kickMember")
            .setLabel("Chutar Membro")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🦶🏻");

        const banMember = new ButtonBuilder()
            .setCustomId("tt/banMember")
            .setLabel("Banir Membro")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("➖");

        const allowMember = new ButtonBuilder()
            .setCustomId("tt/allowMember")
            .setLabel("Permitir Membro")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅");

        const firstRow = new ActionRowBuilder();
        const secondRow = new ActionRowBuilder();
        const thirdRow = new ActionRowBuilder();

        // First row
        firstRow.addComponents(renameParty);
        firstRow.addComponents(togglePrivacy);
        
        // Second row
        secondRow.addComponents(transferPartyOwnership, kickMember);

        // Third row
        thirdRow.addComponents(banMember);
        if(party.isPrivate) thirdRow.addComponents(allowMember);

        const message : any = {
            embeds: [embedMessage],
            components: [firstRow, secondRow, thirdRow],
        }

        return message;
    }

    public async CreateParty(owner: GuildMember, partyName: string, baseChannel: VoiceBasedChannel): Promise<Party | undefined> {
        try {
            const party = new Party(owner.id);

            party.voiceChannel = await baseChannel.clone({name: partyName});
            owner.voice.setChannel(party.voiceChannel);
            party.voiceChannel.permissionOverwrites.edit(party.voiceChannel.guild.roles.everyone, {SendMessages:  true})
            party.voiceChannel.setUserLimit(8);

            PartyManager.parties.set(party.voiceChannel.id, party);
            this.logger.success(`A party [${party.voiceChannel.name}] foi criada por ${owner.user.displayName}`);
    
            // Adiciona mensagem do bot para controlar canal através de interações por botões
            const controlMessage = await party.voiceChannel.send(`Party gerenciada por ${party.voiceChannel.client.user}`);
            controlMessage.edit(this.controlMessage(party));

            return party;
        } catch (error) {
            this.logger.error(`Falha ao criar a party ${partyName} - ${Util.getErrorMessage(error)}`);
        }
    }

    public async TogglePrivacy(requester: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.togglePrivacy();
            this.logger.success(`A privacidade de [${party.voiceChannel.name}] foi alterada para ${(party.isPrivate) ? "privada" : "pública"}.`);

            if(interaction) {
                interaction.message?.edit(this.controlMessage(party));
                const replyMessage = (party.isPrivate) ? `A party agora é privada e apenas membros com permissão podem participar.`
                                     : `A party agora é pública e qualquer membro pode participar.`
                await interaction.reply({
                    content: replyMessage,
                    ephemeral: false,
                })
            }
            

        } catch(error) {
            this.logger.error(`Falha ao tentar trocar a privacidade de [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async RenameParty(requester: User, party: Party, newName: string, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const oldName = party.voiceChannel.name;
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.rename(`🚪${newName}`);
            this.logger.success(`A party [${oldName}] foi renomeada para [${newName}]`);

            if(interaction) {
                interaction.message?.edit(this.controlMessage(party));
                interaction.reply({
                    content: `${requester} renomeou a party para ${party.voiceChannel}.`,
                    ephemeral: false,
                })
            }

        } catch(error) {
            this.logger.error(`Falha ao tentar renomear a party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async CheckOwnership(user: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<boolean> {
        // Check if interaction user is owner of the party
        if(party.ownerId !== user.id) {
            if(interaction) {
                await interaction.reply({
                    content: `Apenas o líder da party pode realizar esta ação!`,
                    ephemeral: true,
                })
            }
            return false;
        }

        return true;
    }

}

export default PartyManager;