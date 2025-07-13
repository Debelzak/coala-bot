import { Interaction as DiscordInteraction, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption, time } from "discord.js"
import { Interaction } from "../../../models/Interaction";

const builder = new SlashCommandBuilder()
    .setName("tl_auction")
    .setDescription("⚖️ Mostra informações de item no leilão")
    .addStringOption(
        new SlashCommandStringOption()
            .setName("item")
            .setDescription("Nome do item para pesquisar")
            .setRequired(true)
            .setAutocomplete(true)
    )

const apiUrl = "https://questlog.gg/throne-and-liberty/api/trpc/actionHouse.getAuctionHouse?input={%22language%22%3A%22pt%22%2C%22regionId%22%3A%22sa-f%22}";

export default new Interaction({
    name: "tl_auction",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isCommand()) return;
        if(!interaction.isChatInputCommand()) return;
        
        const itemName = interaction.options.get("item")?.value;

        const itemId: string = itemName?.toString() || "";
        const message = await interaction.deferReply();
        
        const result = await fetch(apiUrl);
        const responseJson = await result.json();
        const key = responseJson.result.data.findIndex((obj: { id: string; }) => obj.id === itemId);

        const foundItem = responseJson.result.data[key];

        // Item icon
        let itemIcon = foundItem.icon;
        itemIcon = itemIcon.split('.')[0];

        
        const embed = new EmbedBuilder()
        .setTitle(foundItem.name)
        .setDescription("Item - Épico")
        .setThumbnail(`https://cdn.questlog.gg/throne-and-liberty${itemIcon}.webp`)

        // If is trait extract
        if(foundItem.mainCategory === "traitextract") {
            foundItem.traitItems.map((trait: {traitId: number, minPrice: number, inStock: number}) => {
                embed.addFields([
                    {name : "Característica", value: `${getTraitName(trait.traitId)}`, inline: true},
                    {name : "Menor Preço", value: `${trait.minPrice.toLocaleString()}`, inline: true},
                    {name : "Quantidade", value: `${trait.inStock}`, inline: true},
                ])
            })
        } else {
            embed.addFields([
                {name : "Menor Preço", value: `${foundItem.minPrice.toLocaleString()}`, inline: true},
                {name : "Quantidade", value: `${foundItem.inStock.toString()}`, inline: true},
            ])
        }

        await message.edit({
            embeds: [embed]
        });
    }
})

function getTraitName(traitId: number): string {
    switch(traitId) {
        case 1670377857: return "Vida Máxima";
        case 1670377858: return "Regeneração de Vida"; 
        case 1670377859: return "Mana Máxima";
        case 1670377860: return "Regenaração de Mana";
        case 1670377861: return "Bônus de Dano contra Bárbaro";
        case 1670377866: return "#bonus_creation_attack_power";
        case 1670377868: return "Bônus de Dano contra Selvagens";
        case 1670377882: return "Chance de Atordoamento";
        case 1670377899: return "#collide_amplification";
        case 1670377923: return "Chance de Acerto";
        case 1670377924: return "Chance de Acerto Crítico";
        case 1670377925: return "Chance de Ataque Pesado";
        default: return "__desconhecido__";
    }
}