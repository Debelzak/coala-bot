import { Interaction } from "discord.js";
import Logger from "./logger";
import * as interactions from "./interactions"

class Handler {
    private logger: Logger;
    
    constructor() {
        this.logger = new Logger(this.constructor.name);
    }
    
    public async handleInteraction(interaction: Interaction): Promise<void> {
        try {
            if (interaction.isCommand() && interaction.command) {
                for(const [key, command] of Object.entries(interactions.commands)) {
                    if(command.name === interaction.command.name) {
                        const run = command.run;
                        if(run) run(interaction);
                    }
                }
            } else if (interaction.isButton()) {
                for(const [key, button] of Object.entries(interactions.buttons)) {
                    if(button.customId === interaction.customId) {
                        const run = button.run;
                        if(run) run(interaction);
                    }
                }
            }


        } catch (error: unknown) {
            this.logger.error(`Erro ao manusear interação - ${error as string}`);
        }
    }
}

export default new Handler();
