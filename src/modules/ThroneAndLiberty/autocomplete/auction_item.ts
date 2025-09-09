import { Interaction } from "../../../models/Interaction.js";

const apiUrl = "https://questlog.gg/throne-and-liberty/api/trpc/actionHouse.getAuctionHouse?input={%22language%22%3A%22pt%22%2C%22regionId%22%3A%22sa-f%22}";

export default new Interaction({
    name: "auction_item",
    builder: null,
    async run(interaction): Promise<void> {
        if(!interaction.isAutocomplete()) return;
        
        if (interaction.commandName === 'tl_auction') {
            const focusedValue = interaction.options.getFocused();

            if(focusedValue !== "") {
                const result = await fetch(apiUrl);
                const responseJson = await result.json();
    
                const filtered = responseJson.result.data
                    .filter((entry: { id: string, name: string; }) => entry.name.toLowerCase().includes(focusedValue.toLowerCase()))
                    .slice(0, 25);
                
                //const filtered = choices.filter(choice => choice.startsWith(focusedValue));
                await interaction.respond(
                    filtered.map((choice: { name: string; id: string; }) => ({ name: choice.name, value: choice.id })),
                );
            } else {
                await interaction.respond([]);
            }
        }
    }
})