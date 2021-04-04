// TODO
// * daily leaderboard

import Discord = require("discord.js")
import { getChipsTossup } from "./chips_tossups"
import { formatAnswer, isAnswerCorrect } from "./format_answer"
import { loot, lootDescriptions, LootItem } from "./lootbox"
import { getQuizDbQuestion } from "./quizdb"
import configJson from "./token.json"
import fs from "fs"
import { handleRpgMessages, RpgRoomName } from "./rpg"

const client = new Discord.Client()
const config = {
  token: configJson.token,
  prefix: "!",
}

client.on("ready", () => {
  console.log(`[${new Date().toString()}]Kickbot online.`)

  client.user!.setPresence({ activity: { name: ":eyes:" } })
})

export const sleep = async (ms: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

let emojiToConditionCode: { [key: string]: string } = {
  // "🔪": `return [...msg.content.toLowerCase()].filter((l) => l === "e").length === 2`,
}

const satisfiesCondition = (msg: Discord.Message, conditionCode: string) => {
  try {
    return eval("(msg) => { " + conditionCode + "}")(msg)
  } catch (e) {
    console.log(e)
    msg.channel.send(e.toString())
    return false
  }
}

export const persistentData: {
  inventories: { [username: string]: LootItem[] }
  scores: { [username: string]: number }
  locations: { [username: string]: RpgRoomName }
} = JSON.parse(fs.readFileSync("save/save.json", "utf-8")) ?? {
  inventories: [],
  scores: [],
}

export const save = () => {
  fs.writeFileSync("save/save.json", JSON.stringify(persistentData))
}

// const reactWithNumber = async (message: Discord.Message, number: number) => {
//   let strs = String(number).split("")
//   let numToEmoji: { [key: string]: string } = {
//     "0": "0️⃣",
//     "1": "1️⃣",
//     "2": "2️⃣",
//     "3": "3️⃣",
//     "4": "4️⃣",
//     "5": "5️⃣",
//     "6": "6️⃣",
//     "7": "7️⃣",
//     "8": "8️⃣",
//     "9": "9️⃣",
//   }

//   for (const number of strs) {
//     await message.react(numToEmoji[number])
//   }
// }

client.on(
  "message",
  async (message): Promise<void> => {
    if (message.author.bot) {
      return
    }

    const msg = message.content

    handleRpgMessages(message)

    for (const [emoji, code] of Object.entries(emojiToConditionCode)) {
      if (satisfiesCondition(message, code)) {
        await message.react(emoji)
      }
    }

    if (message.content.toLowerCase() === "!loottesting") {
      await loot(message.author, message.channel)
    }

    if (message.content.toLowerCase() === "!inventory") {
      const myInventory =
        persistentData.inventories[message.author.username] ?? []
      const myPoints = persistentData.scores[message.author.username] ?? 0

      if (myInventory.length === 0) {
        await message.channel.send(
          "Inventory:\n\n```" + `${myPoints} points` + "```"
        )
      } else {
        await message.channel.send(
          "Inventory:\n\n```" +
            `${myPoints} points\n` +
            myInventory.join("\n") +
            "```\n\nInspect an item with `!inspect [item name]`."
        )
      }
    }

    if (message.content.toLowerCase().startsWith("!inspect")) {
      const inspectedItem = message.content.split(" ").slice(1).join(" ")
      const myInventory =
        persistentData.inventories[message.author.username] ?? []

      if (
        !myInventory.find(
          (item) => item.toLowerCase() === inspectedItem.toLowerCase()
        )
      ) {
        await message.channel.send(
          `You don't have an item named ${inspectedItem} in your inventory!\n\nUse \`!inventory\` to see the contents of your inventory.`
        )
        return
      }

      for (const [name, desc] of Object.entries(lootDescriptions)) {
        if (name.toLowerCase() === inspectedItem.toLowerCase()) {
          await message.channel.send(`\`${name}\`\n\n${desc}`)

          return
        }
      }
    }

    if (message.content.startsWith("!newcondition")) {
      let emoji = message.content.split(" ")[1]

      const code = message.content.slice(
        message.content.indexOf("```") + 3,
        message.content.lastIndexOf("```")
      )

      emojiToConditionCode[emoji] = code

      await message.channel.send(
        "Hi! Updating my condition for " + emoji + " to ```" + code + "```"
      )
    }

    if (
      (message.content.toLowerCase().startsWith("i'm ") ||
        message.content.toLowerCase().startsWith("im ")) &&
      Math.random() > 0.7
    ) {
      const r = Math.floor(Math.random() * 10)

      if (r === 0) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! I'm bot :slight_smile: "
        )
      } else if (r === 1) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! egg! "
        )
      } else if (r === 2) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! Nice to meet you! I'm bot. "
        )
      } else if (r === 3) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! :slight_smile: "
        )
      } else if (r === 4) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! You know what im gonna say next "
        )
      } else if (r === 5) {
        const m = await message.channel.send(
          "Hi " +
            msg.slice(3).trim() +
            "! You know what im gonna say next :slight_smile:"
        )
      } else if (r === 6) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! I'm scrambie! no wait..."
        )
      } else if (r === 7) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "! I'm bot! beep boop im a robot"
        )
      } else if (r === 8) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "!!! >:D "
        )
      } else if (r === 9) {
        const m = await message.channel.send(
          "Hi " + msg.slice(3).trim() + "!!! I'm bot"
        )
      }
    }

    if (
      message.content.toLowerCase().startsWith("hi ") &&
      message.content.length > 5
    ) {
      const words = message.content.split(" ")
      const newName = words.slice(1).join(" ") ?? ""

      try {
        message.guild?.me?.setNickname(newName.slice(0, 31))
        const m = await message.channel.send(
          `hi ${message.author.username}! thanks for greeting me :slight_smile: `
        )
      } catch (e) {
        console.log(e)
      }
    }

    if (message.content.indexOf(config.prefix) !== 0) {
      return
    }
  }
)

const start = async () => {
  // if (process.env.NODE_APP_INSTANCE === "0") {
  const c = await client.login(config.token)
  // }
}

start()
