import { Client, GuildMember } from "discord.js";
import * as commands from "./commands/index.js";
import * as buttons from "./buttons/index.js";
import Module from "../../models/Module.js";
import VoiceAdeptMember from "./models/VoiceAdeptMember.js";
import VoiceAdeptRole from "./models/VoiceAdeptRole.js";
import Worker from "../../worker.js";

class CoalaBase extends Module {
    // @Chegado em call
    private readonly VOICE_ADEPT_CHECK_TICK_TIME_MS: number = 1 * 60 * 60 * 1000; // 1h
    private readonly VOICE_ADEPT_PARTICIPATION_TIME_MS: number = 1 * 60 * 60 * 1000; // 1h
    public voiceAdeptRoles = new Map<string, VoiceAdeptRole>();
    public voiceAdeptMembers = new Map<string, VoiceAdeptMember>();
    public voiceAdeptCandidates = new Map<string, NodeJS.Timeout>();

    init(client: Client): void {
        super.init(client);
        this.registerInteractions(commands);
        this.registerInteractions(buttons);

        this.buildVoiceAdeptRolesCache();
        this.buildVoiceAdeptMembersCache();
        
        setInterval(() => this.voiceAdeptRolesTick(), this.VOICE_ADEPT_CHECK_TICK_TIME_MS);

        client.on("messageCreate", (message) => {
            if (!message.author.bot && !message.guild) {
                message.reply("Cale a boque");
            }
        });

        client.on("voiceStateUpdate", (oldState, newState) => {
            const member = newState.member;
            if (!member) return;

            if (newState.channel !== oldState.channel) {
                const isMember = this.voiceAdeptMembers.has(member.id);
                const isCandidate = this.voiceAdeptCandidates.has(member.id);

                if (isMember) {
                    const voiceMember = this.voiceAdeptMembers.get(member.id)!;
                    voiceMember.lastSeen = Date.now();
                    voiceMember.DB_Save();
                    return;
                }

                if (newState.channel && !isCandidate) {
                    const timer = setTimeout(() => {
                        this.insertNewVoiceAdeptMember(member);
                    }, this.VOICE_ADEPT_PARTICIPATION_TIME_MS);

                    this.voiceAdeptCandidates.set(member.id, timer);
                } else if (!newState.channel && isCandidate) {
                    const timer = this.voiceAdeptCandidates.get(member.id);
                    if (timer) clearTimeout(timer);
                    this.voiceAdeptCandidates.delete(member.id);
                }
            }
        });
    }

    private insertNewVoiceAdeptMember(member: GuildMember): void {
        const role = this.voiceAdeptRoles.get(member.guild.id);
        if (!role || this.voiceAdeptMembers.has(member.id)) return;

        const guildRole = member.guild.roles.cache.get(role.roleId);
        if (!guildRole) return;

        const voiceMember = new VoiceAdeptMember();
        voiceMember.guildId = member.guild.id;
        voiceMember.memberId = member.id;
        voiceMember.lastSeen = Date.now();

        member.roles.add(role.roleId)
            .then(() => {
                this.voiceAdeptMembers.set(member.id, voiceMember);
                voiceMember.DB_Save();

                if (role.announceWebhookURL) {
                    this.sendAnnounce(
                        role.announceWebhookURL,
                        `Membro ${member} é ${guildRole}`,
                        guildRole.hexColor
                    );
                    this.logger.success(
                        `Adicionando cargo [${role.roleName}] para [${member.displayName}] por atividade em canal de voz.`
                    );
                }
            })
            .catch(err => this.logger.error(err.message));
    }

    private buildVoiceAdeptRolesCache(): void {
        VoiceAdeptRole.DB_GetAll()
            .then(roles => roles.forEach(r => this.setVoiceAdeptRole(r)))
            .catch(err => this.logger.error(err.message));
    }

    private buildVoiceAdeptMembersCache(): void {
        VoiceAdeptMember.DB_GetAll()
            .then(members => members.forEach(m => this.setVoiceAdeptMember(m)))
            .catch(err => this.logger.error(err.message));
    }

    private setVoiceAdeptRole(role: VoiceAdeptRole) {
        const guild = this.client?.guilds.cache.get(role.guildId);
        if (!guild) {
            this.logger.warning(`Guild [${role.guildId}] não encontrada. Removendo registro.`);
            role.DB_Delete();
            return;
        }

        const guildRole = guild.roles.cache.get(role.roleId);
        if (!guildRole) {
            this.logger.warning(`Cargo [${role.roleId}] não encontrado na guild [${guild.name}]. Removendo registro.`);
            role.DB_Delete();
            return;
        }

        role.guildName = guild.name;
        role.roleName = guildRole.name;
        this.voiceAdeptRoles.set(role.guildId, role);
        role.DB_Save();

        this.logger.success(
            `Cargo [${role.roleName}] no servidor [${role.guildName}] será atribuído a membros ativos em calls nos últimos ${role.expirationDays} dias.`
        );
    }

    private setVoiceAdeptMember(member: VoiceAdeptMember) {
        const guild = this.client?.guilds.cache.get(member.guildId);
        if (!guild) return;

        const guildMember = guild.members.cache.get(member.memberId);
        if (!guildMember) {
            this.logger.warning(`Membro [${member.memberId}] não encontrado na guild [${guild.name}]. Removendo registro.`);
            member.DB_Delete();
            return;
        }

        this.voiceAdeptMembers.set(member.memberId, member);
    }

    private voiceAdeptRolesTick(): void {
        this.client?.guilds.cache.forEach(guild => {
            const managedRole = this.voiceAdeptRoles.get(guild.id);
            if (!managedRole) return;

            guild.members.cache.forEach(member => {
                const roleMember = this.voiceAdeptMembers.get(member.id);
                if (!roleMember) return;

                const lastSeen = new Date(roleMember.lastSeen);
                const expirationDate = new Date(lastSeen);
                expirationDate.setDate(lastSeen.getDate() + managedRole.expirationDays);

                if (Date.now() >= expirationDate.getTime()) {
                    member.roles.remove(managedRole.roleId)
                        .then(() => {
                            roleMember.DB_Delete();
                            this.voiceAdeptMembers.delete(member.id);

                            const guildRole = guild.roles.cache.get(managedRole.roleId);
                            if (managedRole.announceWebhookURL && guildRole) {
                                this.sendAnnounce(
                                    managedRole.announceWebhookURL,
                                    `Membro ${member} não é mais ${guildRole}`,
                                    guildRole.hexColor
                                );
                            }

                            this.logger.success(
                                `Removendo cargo [${managedRole.roleName}] de [${member.displayName}] por inatividade.`
                            );
                        })
                        .catch(err => this.logger.error(err.message));
                }
            });
        });
    }

    private sendAnnounce(webhookURL: string, message: string, color?: string) {
        const colorInt = color ? parseInt(color.replace("#", ""), 16) : 0x000000;

        const payload = {
            //username: this.client?.user?.username,
            //avatar_url: this.client?.user?.displayAvatarURL(),
            embeds: [
                {
                    description: message,
                    color: colorInt,
                    footer: {
                        text: `Mensagem via Webhook — ${this.client?.user?.username} ${Worker.getVersion()}`
                    }
                }
            ]
        };

        fetch(webhookURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).catch(err => this.logger.error(err.message));
    }
}

export default new CoalaBase();
