import sqlite3 from "sqlite3";
const { Database } = sqlite3;

export default class VoiceAdeptMember {
    memberId: string = '';
    guildId: string = '';
    lastSeen: number = Date.now();

    private static readonly db: sqlite3.Database = new Database("./database/VoiceAdeptRole.db");

    public static DB_GetAll(): Promise<Map<string, VoiceAdeptMember>> {
        let voiceAdeptMembers = new Map<string, VoiceAdeptMember>();

        return new Promise((resolve, reject) => {
            let voiceAdeptMember = new VoiceAdeptMember();
            VoiceAdeptMember.db.each("SELECT * FROM members", (error: Error, row: VoiceAdeptMember) => {
                voiceAdeptMember.memberId = row.memberId;
                voiceAdeptMember.guildId = row.guildId;
                voiceAdeptMember.lastSeen = row.lastSeen;

                voiceAdeptMembers.set(row.memberId, voiceAdeptMember);
            }, (error: Error, numberOfRows: number) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve(voiceAdeptMembers)
            })
        })
    }

    public DB_Delete(): void {
        VoiceAdeptMember.db.run(`DELETE FROM members WHERE memberId=?`, [this.memberId]);
    }

    public DB_Save(): void {
        VoiceAdeptMember.db.get("SELECT * FROM members WHERE memberId=?", [this.memberId], (err: Error, row: VoiceAdeptMember) => {
            if(row) {
                VoiceAdeptMember.db.run(`UPDATE members SET lastSeen=? WHERE memberId=? AND guildId=?`, [this.lastSeen, this.memberId, this.guildId])
            } else {
                VoiceAdeptMember.db.run(`INSERT INTO members (memberId, guildId, lastSeen) VALUES (?, ?, ?)`, [this.memberId, this.guildId, this.lastSeen])
            }
        })
    }

    public static DB_Initialize(): void {
        VoiceAdeptMember.db.exec(`
            CREATE TABLE IF NOT EXISTS members
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memberId VARCHAR(50) NOT NULL UNIQUE,
                guildId VARCHAR(50) NOT NULL,
                lastSeen DATETIME NOT NULL
            );
        `);
    }

}

VoiceAdeptMember.DB_Initialize();