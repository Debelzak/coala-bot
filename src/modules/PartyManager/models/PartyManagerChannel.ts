import { GuildMember, VoiceBasedChannel } from "discord.js";
import { Database } from "sqlite3";
import PartyManager from "../partyManager";
import Worker from "../../../worker";

export class PartyManagerChannel {
    public readonly channelId: string;
    public defaultPartyName: string = "Party de %USER%";
    public maxUsers?: number = 16;
    public readonly guildId: string;
    public readonly guildName: string;
    public partyCount: number = 0;

    private static readonly db: Database = new Database("./database/PartyManager.db");

    constructor(channelId: string, guildId: string, guildName: string) {
        this.channelId = channelId;
        this.guildId = guildId;
        this.guildName = guildName;
    }

    public GetDefaultName(member: GuildMember): string {
        let newName = this.defaultPartyName;

        if(this.defaultPartyName.includes("%USER%")) {
            const userName: string = (member.nickname !== null) ? member.nickname : member.displayName;
            newName = newName.replace('%USER%', userName);
        }

        if(this.defaultPartyName.includes("%INC%")) {
            let index = this.partyCount + 1;
            newName = newName.replace('%INC%', index.toString());
        }
        
        if(this.defaultPartyName.includes("%GAME%")) {
            let gameName = "Um jogo";
  
            if(member.presence?.activities && member.presence?.activities.length > 0) {
                let playingGame = member.presence?.activities[0].name;
                gameName = playingGame;
            }

            newName = newName.replace('%GAME%', gameName);
        }

        // return
        return newName;
    }

    public DB_Delete(): void {
        PartyManagerChannel.db.run(`DELETE FROM managed_channels WHERE channelId=?`, [this.channelId]);
    }

    public DB_Save(): void {
        PartyManagerChannel.db.get("SELECT * FROM managed_channels WHERE channelId=?", [this.channelId], (err: Error, row: PartyManagerChannel) => {
            if(row) {
                PartyManagerChannel.db.run(`UPDATE managed_channels SET defaultPartyName=?, maxUsers=? WHERE channelid=?`, [this.defaultPartyName, this.maxUsers, this.channelId])
            } else {
                PartyManagerChannel.db.run(`INSERT INTO managed_channels (channelId, defaultPartyName, maxUsers, guildId, guildName) VALUES (?, ?, ?, ?, ?)`, [this.channelId, this.defaultPartyName, this.maxUsers, this.guildId, this.guildName])
            }
        })
    }

    public static async DB_GetAll(): Promise<Map<string, PartyManagerChannel>> {
        let managerChannels: Map<string, PartyManagerChannel> = new Map<string, PartyManagerChannel>();
        
        return new Promise((resolve, reject) => {
            PartyManagerChannel.db.each("SELECT * FROM managed_channels", (error: Error, row: PartyManagerChannel) => {
                const manager = new PartyManagerChannel(row.channelId, row.guildId, row.guildName);
                manager.defaultPartyName = row.defaultPartyName;
                manager.maxUsers = row.maxUsers;
                managerChannels.set(row.channelId, manager);
            }, (error: Error, numberOfRows: number) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve(managerChannels)
            })
        })
    }

    public static DB_Initialize(): void {
        PartyManagerChannel.db.exec(`
            CREATE TABLE IF NOT EXISTS managed_channels
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channelId VARCHAR(50) NOT NULL UNIQUE,
                defaultPartyName VARCHAR(50) NOT NULL,
                maxUsers INTEGER NOT NULL,
                guildId VARCHAR(50) NOT NULL,
                guildName VARCHAR(50) NOT NULL
            );
        `);
    }
}

PartyManagerChannel.DB_Initialize();