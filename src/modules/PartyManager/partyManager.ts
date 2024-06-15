import { 
    Client, GuildMember, ButtonInteraction,
    BaseMessageOptions, EmbedBuilder, ButtonBuilder, ButtonStyle,
    ActionRowBuilder, ModalSubmitInteraction, User, Channel,
    Guild 
} from "discord.js"
import Party from "./models/Party";
import Util from "../../util/utils";
import Module from "../../models/Module";
import { PartyManagerChannel } from "./models/PartyManagerChannel";
import * as commands from "./commands"
import * as buttons from "./buttons"

class PartyManager extends Module {
    public readonly parties: Map<string, Party> = new Map<string, Party>();
    public readonly managerChannels: Map<string, PartyManagerChannel> = new Map<string, PartyManagerChannel>();

    constructor() {
        super();
    }

    init(client: Client): void {
        super.init(client);
        this.registerInteractions(commands);
        this.registerInteractions(buttons);
        this.buildManagerCache();
        this.buildPartyCache();
        this.initPartyManagement();
    }

    private buildPartyCache() {
        // TODO: Necessário para manter registro de parties antigas no caso do programa ser reiniciado ou crashar.
    }

    private async buildManagerCache(): Promise<void> {
        const managers = await PartyManagerChannel.DB_GetAll();
        PartyManagerChannel.DB_GetAll().then((managers) => {
            for(const [key, manager] of managers) {
                this.addManagerChannel(manager);
            }
        });
    }

    private addManagerChannel(manager: PartyManagerChannel): boolean {
        const channel: Channel | undefined = this.client?.channels.cache.get(manager.channelId);
        if(channel?.isVoiceBased()) {
            this.managerChannels.set(channel.id, manager);
            this.logger.success(`[${channel.guild.name}] Gerenciando canal de voz [${channel.name}].`);
            return true;
        } else {
            this.logger.warning(`Canal de voz [${manager.channelId}] não encontrado. Ignorando e excluindo entrada...`);
            manager.DB_Delete();
        }

        return false;
    }

    public newManagerChannel(channelId: string) {
        const channel = this.client?.channels.cache.get(channelId);
        if(!channel?.isVoiceBased()) return;

        const manager = new PartyManagerChannel(channelId, channel.guild.id, channel.guild.name);
        if(this.addManagerChannel(manager)) {
            manager.DB_Save();
        }
    }

    public removeManagerChannel(channelId: string) {
        const channel: Channel | undefined = this.client?.channels.cache.get(channelId);
        const manager = this.managerChannels.get(channelId)
        if(manager) {
            if(channel && channel.isVoiceBased()) {
                this.logger.success(`[${channel.guild.name}] Parando de gerenciar o canal [${channel.name}].`);
            }
            
            this.managerChannels.delete(channelId);
            manager.DB_Delete();
        }
    }

    private initPartyManagement(): void {
        this.client?.on('voiceStateUpdate', async (oldVoiceState, newVoiceState) => {
            const guildName = (newVoiceState) ? newVoiceState.guild.name : oldVoiceState.guild.name;

            // Se um membro se conectou/desconectou a um canal.
            if (newVoiceState.channel !== oldVoiceState.channel) {
                if(!newVoiceState.member) return;
                const member: GuildMember = newVoiceState.member;
                const userName: string = (newVoiceState.member.nickname !== null) ? newVoiceState.member.nickname : newVoiceState.member.displayName;

                const partyManagerEntered: PartyManagerChannel | undefined = (newVoiceState.channelId) ? this.managerChannels.get(newVoiceState.channelId) : undefined;
                const partyEntered: Party | undefined = (newVoiceState.channelId) ? this.parties.get(newVoiceState.channelId) : undefined;
                const partyExited: Party | undefined = (oldVoiceState.channelId) ? this.parties.get(oldVoiceState.channelId) : undefined;

                if(!member) return;

                if(partyManagerEntered) { // Se entrou em canal gerenciado pelo bot (Canal de Criar Party)
                    try {
                        await this.CreateParty(partyManagerEntered, member);
                        partyManagerEntered.partyCount++;
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }

                if(partyEntered) { // Se conectou a alguma party
                    try {
                        partyEntered.addUser(member);
                        this.logger.success(`[${guildName}] ${partyEntered.voiceChannel.name} (${partyEntered.connectedUsers}/${partyEntered.voiceChannel.userLimit}) - ${userName} entrou na party.`);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
                
                if(partyExited) { // Se desconectou de alguma party
                    try {                        
                        partyExited.removeUser(member);
                        this.logger.success(`[${guildName}] ${partyExited.voiceChannel.name} (${partyExited.connectedUsers}/${partyExited.voiceChannel.userLimit}) - ${userName} saiu da party.`);

                        // Transfere a liderança ao sair
                        if(partyExited.currentParticipants.size > 0 && member.user.id === partyExited.ownerId) {
                            const nextLeader = Array.from(partyExited.currentParticipants.entries())[0][0];
                            this.TransferOwnership(nextLeader, partyExited);
                            this.ReloadControlMessage(partyExited);
                        }

                        // Delete party se estiver vazia.
                        if(partyExited.connectedUsers <= 0) {
                            this.logger.success(`[${guildName}] Nenhum membro restante em [${partyExited.voiceChannel.name}], excluindo...`);
                            await partyExited.voiceChannel.delete();
                            this.parties.delete(partyExited.voiceChannel.id);
                            partyExited.manager.partyCount--;
                        }
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
            }
        })
    }

    private async CreateParty(manager: PartyManagerChannel, owner: GuildMember, partyName?: string): Promise<void> {
        try {
            const channel: Channel | undefined = this.client?.channels.cache.get(manager.channelId);
            if(!channel?.isVoiceBased()) return;

            const partyVoiceChannel = await channel.clone({
                name: (partyName) ? partyName : manager.GetDefaultName(owner), 
                userLimit: manager.maxUsers, 
                permissionOverwrites: [
                    {allow: "SendMessages", id: channel.guild.roles.everyone.id}
                ]
            });

            const party = new Party(owner.id, partyVoiceChannel, manager);
            party.addUser(owner);
            
            this.parties.set(party.voiceChannel.id, party);
            this.logger.success(`[${party.voiceChannel.guild.name}] A party [${party.voiceChannel.name}] foi criada por ${owner.user.displayName}`);
            
            // Move criador da party para a mesma.
            owner.voice.setChannel(partyVoiceChannel)
            
            // Cria mensagem de controle da party
            party.controlMessage = await partyVoiceChannel.send(`Party gerenciada por ${partyVoiceChannel.client.user}`);
            this.ReloadControlMessage(party);
        } catch (error) {
            this.logger.error(`Falha ao criar a party ${manager.GetDefaultName(owner)} - ${Util.getErrorMessage(error)}`);
        }
    }

    public async TogglePrivacy(requester: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            party.togglePrivacity();
            party.currentParticipants.forEach((participant) => {
                party.voiceChannel.permissionOverwrites.edit(participant, {Connect:  true, ViewChannel: true});
            })
            
            party.voiceChannel.permissionOverwrites.edit(party.voiceChannel.guild.roles.everyone, {Connect: !party.isPrivate, ViewChannel: !party.isPrivate});

            this.logger.success(`[${party.voiceChannel.guild.name}] A privacidade de [${party.voiceChannel.name}] foi alterada para ${(party.isPrivate) ? "privada" : "pública"}.`);

            if(interaction) {
                this.ReloadControlMessage(party);
                const replyMessage = (party.isPrivate) ? `A party agora é privada e apenas membros com permissão podem ver ou participar.`
                                     : `A party agora é pública e qualquer membro pode ver ou participar.`
                await interaction.reply({
                    content: replyMessage,
                    ephemeral: false,
                })
            }
            

        } catch(error) {
            this.logger.error(`[${party.voiceChannel.guild.name}] Falha ao tentar trocar a privacidade de [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async RenameParty(requester: User, party: Party, newName: string, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const oldName = party.voiceChannel.name;
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.rename(`${newName}`);
            this.logger.success(`[${party.voiceChannel.guild.name}] A party [${oldName}] foi renomeada para [${newName}]`);

            if(interaction) {
                this.ReloadControlMessage(party);
                interaction.reply({
                    content: `${requester} renomeou a party para ${party.voiceChannel}.`,
                    ephemeral: false,
                })
            }

        } catch(error) {
            this.logger.error(`[${party.voiceChannel.guild.name}] Falha ao tentar renomear a party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public TransferOwnership(newLeaderId: string, party: Party): boolean {
        const guild: Guild | undefined = this.client?.guilds.cache.get(party.voiceChannel.guildId);
        const member = guild?.members.cache.get(newLeaderId);

        if(member) {
            try {
                if(party.changeOwner(member)) {
                    this.logger.success(`[${party.voiceChannel.guild.name}] A liderança da party [${party.voiceChannel.name}] foi passada para [${member.displayName}].`);
                    party.controlMessage?.reply(`A liderança da party agora é de ${member}`);
                    return true;
                }
            } catch (error) {
                this.logger.warning(`[${party.voiceChannel.guild.name}] Falha ao transferir a liderança da party [${party.voiceChannel.name}] para [${member.displayName}]. - ${Util.getErrorMessage(error)}`);
            }
        }

        return false;
    }

    public async BanMembers(memberIds: string[], party: Party): Promise<GuildMember[]> {
        let promises: Promise<any>[] = [];
        let result: GuildMember[] = [];

        const guild = party.voiceChannel.guild;
        
        if(guild) {
            for(const memberId of memberIds) {
                if(memberId === party.ownerId) continue;
                
                const member = guild.members.cache.get(memberId);
                if(member) {
                    party.denyUserEntrance(member);

                    // Se membro está na party, expulsa.
                    if(party.currentParticipants.get(member.id) === member)
                        promises.push(this.KickMember(member, party));

                    promises.push(party.voiceChannel.permissionOverwrites.edit(member, {Connect:  false, ViewChannel: false}));
                    result.push(member);
                }
            }
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            this.logger.error(`[${party.voiceChannel.guild.name}] Falha ao banir membros da party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }

        return result;
    }

    public async AllowMembers(memberIds: string[], party: Party): Promise<GuildMember[]> {
        let promises: Promise<any>[] = [];
        let result: GuildMember[] = [];

        const guild = party.voiceChannel.guild;

        if(guild) {
            for(const memberId of memberIds) {
                const member = guild.members.cache.get(memberId);
                if(member) {
                    party.allowUserEntrance(member);
                    promises.push(party.voiceChannel.permissionOverwrites.edit(member, {Connect:  true, ViewChannel: true}));
                    result.push(member);
                }
            }
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            this.logger.error(`[${party.voiceChannel.guild.name}] Falha ao permitir membros na party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }

        return result;
    }

    public async KickMember(member: GuildMember, party: Party): Promise<void>
    {
        try {
            await member.voice.setChannel(null);
            this.logger.success(`${member.displayName} foi expulso de [${party.voiceChannel.name}]`);
        } catch(error) {
            this.logger.error(`[${party.voiceChannel.guild.name}] Falha ao remover membro do canal - ${Util.getErrorMessage(error)}`);
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

    private controlMessage(party: Party): BaseMessageOptions {
        let bannedMembers: string = (party.bannedParticipants.size > 0) ? "" : "Nenhum"
        let allowedMembers: string = (party.allowedParticipants.size > 0) ? "" : "Nenhum"
        for(const member of party.bannedParticipants) {
            bannedMembers = bannedMembers.concat(`${member[1]} `);
        }

        for(const member of party.allowedParticipants) {
            allowedMembers = allowedMembers.concat(`${member[1]} `);
        }

        const embedMessage = new EmbedBuilder()
            .setColor(0x0099FF)
            .addFields({ name: 'Canal', value: `${party.voiceChannel}`, inline: false})
            .addFields({ name: 'Privacidade', value: `${(party.isPrivate) ? `Privada` : `Pública`}`, inline: false})
            .addFields({ name: 'Líder', value: `${this.client?.users.cache.get(party.ownerId)}`, inline: false})
            .addFields({ name: 'Membros Banidos', value: `${bannedMembers}`, inline: true})
            .addFields({ name: 'Membros Permitidos', value: `${allowedMembers}`, inline: true})

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

        const banMember = new ButtonBuilder()
            .setCustomId("btn_banPartyMembers")
            .setLabel("Banir Membro")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("➖");

        const allowMember = new ButtonBuilder()
            .setCustomId("btn_allowPartyMembers")
            .setLabel("Permitir Membro")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅");

        const firstRow: ActionRowBuilder = new ActionRowBuilder();
        const secondRow = new ActionRowBuilder();
        const thirdRow = new ActionRowBuilder();

        // First row
        firstRow.addComponents(renameParty);
        firstRow.addComponents(togglePrivacy);
        
        // Second row
        secondRow.addComponents(transferPartyOwnership, banMember);

        // Third row
        thirdRow.addComponents(allowMember);

        const message: any = {
            embeds: [embedMessage],
            components: [firstRow, secondRow],
        };

        if(party.isPrivate || party.bannedParticipants.size > 0) message.components?.push(thirdRow);
            
        return message;
    }

    public async ReloadControlMessage(party: Party)
    {
        try {
            await party.controlMessage?.edit(this.controlMessage(party));
        } catch(error) {
            this.logger.error(`[${party.voiceChannel.guild.name}] Falha ao criar mensagem de controle para a party ${party.voiceChannel.name} - ${Util.getErrorMessage(error)}`);
        }
    }

}

export default new PartyManager();