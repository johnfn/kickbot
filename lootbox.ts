import Discord = require("discord.js")
import { persistentData } from "./kickbot"
import fs from "fs"

export enum LootItem {
  "Orb of Awesomeness" = "Orb of Awesomeness",
  "Knife of Destiny" = "Knife of Destiny",
  "Nothing" = "Nothing",
  "Small Key" = "Small Key",
  "Boss Key" = "Boss Key",
  "Pokeball" = "Pokeball",
  "Egg" = "Egg",
  "Unidentified Amulet" = "Unidentified Amulet",
  "5 Coins" = "5 Coins",
  "Potion" = "Potion",
  "Cobb Salad" = "Cobb Salad",
  "Master Sword" = "Master Sword",
  "Real Knife" = "Real Knife",
  "Rare Candy" = "Rare Candy",
}

export const lootItems = [
  LootItem["Orb of Awesomeness"],
  LootItem["Knife of Destiny"],
  LootItem["Nothing"],
  LootItem["Small Key"],
  LootItem["Boss Key"],
  LootItem["Pokeball"],
  LootItem["Egg"],
  LootItem["Unidentified Amulet"],
  LootItem["5 Coins"],
  LootItem["Potion"],
  LootItem["Cobb Salad"],
  LootItem["Master Sword"],
  LootItem["Real Knife"],
  LootItem["Rare Candy"],
]

export const lootDescriptions: { [key in LootItem]: string } = {
  "5 Coins": "Five round, shiny coins! I wonder what I could buy with them.",
  "Boss Key": "This key has a lot of subordinate keys that it manages.",
  "Cobb Salad":
    "This is a Cobb salad, the best food that exists. Eating it will restore 10 HP.",
  Egg: "This is an egg. You have no idea what it does.",
  "Knife of Destiny":
    "This is the Knife of Destiny. You're not sure whose destiny, though.",
  "Master Sword":
    "This sword spent a long time as a Journeyman Sword before finally levelling up.",
  Nothing: "This is nothing. It seems entirely pointless.",
  "Orb of Awesomeness": "This orb is so awesome. Wait... is it a disco ball?",
  Pokeball:
    "It's a standard-grade Kanto Pokeball. You can use it to catch Pokemon.",
  Potion: "This will restore 5 HP.",
  "Rare Candy": "You don't know what this does, but it looks delicious.",
  "Real Knife": "As contrasted to a fake knife. This is the real deal.",
  "Small Key": "This key is really small. I wonder what it unlocks?",
  "Unidentified Amulet":
    "This amulet appears to have magical powers, but you have no clue what they could be.",
}

export const loot = async (
  winner: Discord.User,
  channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel
): Promise<LootItem | null> => {
  let three = lootItems.sort(() => Math.random() - 0.5).slice(0, 3)
  let text = "LOOT BOX!\n\n" + three.join("\n")

  const message = await channel.send(text)
  let awardedItem: LootItem | undefined

  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1200))

    text =
      "LOOT BOX!\n\n" +
      three
        .map((item, j) => {
          const isFocused = i % 3 === j

          if (isFocused) {
            awardedItem = item
            return `**${item}**`
          } else {
            return `${item}`
          }
        })
        .join("\n")

    await message.edit(text)
  }

  await new Promise((resolve) => setTimeout(resolve, 1200))

  if (awardedItem === undefined) {
    await message.edit("This is a bug. Please ping johnfn.")

    return null
  }

  await message.edit(
    "You are now the proud owner of a " +
      awardedItem +
      `!\n\nInspect it: \`!inspect ${awardedItem}\`\nSee your inventory: \`!inventory\``
  )

  persistentData.inventories[winner.username] ??= []
  persistentData.inventories[winner.username].push(awardedItem)

  fs.writeFileSync("save/save.json", JSON.stringify(persistentData))

  return awardedItem
}
