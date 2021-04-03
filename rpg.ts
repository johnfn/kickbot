import Discord = require("discord.js")
import { persistentData, save } from "./kickbot"

export enum RpgRoomName {
  "Tavern" = "Tavern",
  "Tavern Upper Level" = "Tavern Upper Level",
  "Outside Tavern" = "Outside Tavern",
}

const Rooms: {
  [key in RpgRoomName]: {
    exits: RpgRoomName[]
    description: string
  }
} = {
  "Outside Tavern": {
    exits: [RpgRoomName["Tavern"]],
    description:
      "You're standing outside. There is a tavern in front of you, and from it you can hear the lively sounds of people eating and drinking.",
  },

  Tavern: {
    exits: [RpgRoomName["Tavern Upper Level"], RpgRoomName["Outside Tavern"]],
    description:
      "You're standing in a tavern. The room is spacious and filled with people chatting loudly - some of whom look a little drunk. A bartender stands behind the bar, and he catches your eye as if to ask if you want anything to drink. Further back, you see some stairs leading up.",
  },

  "Tavern Upper Level": {
    exits: [RpgRoomName.Tavern],
    description:
      "You're on the second floor of the tavern. The conversations from below are audible, but muted by the distance and the flooring. You see a few rooms where it looks like you could take a rest, if you wanted.",
  },
}

const RPG_CHANNEL_ID = "827987425783316502"

const getRoom = (message: Discord.Message) => {
  let location: RpgRoomName | undefined =
    persistentData.locations[message.author.username]

  if (!location) {
    location = persistentData.locations[message.author.username] =
      RpgRoomName.Tavern
    save()
  }

  return location
}

const lookAtCurrentRoom = async (
  message: Discord.Message,
  justEntered = false
) => {
  const roomName = getRoom(message)
  const room = Rooms[roomName]
  let fullDescription =
    `${justEntered ? "You enter the " : ""}**${roomName}**\n${
      room.description
    }\n\n**Exits:**\n` +
    room.exits
      .map((roomName, i) => {
        return `\`!enter ${i + 1}: ${roomName}`
      })
      .join("\n")

  const msg = await message.channel.send(fullDescription)

  for (let i = 1; i <= room.exits.length; i++) {
    msg.react(`:regional_indicator_${i}:`)
  }
}

export const handleRpgMessages = async (message: Discord.Message) => {
  if (message.channel.id !== RPG_CHANNEL_ID) return

  // TODO: Use emoji reactions
  if (message.content.startsWith("!enter")) {
    const number = Number(message.content.split(" ")[1])
    const roomName = getRoom(message)
    const room = Rooms[roomName]

    const nextRoom = room.exits[number - 1]

    if (!nextRoom) {
      await message.channel.send(
        "That's not a valid room. Don't mess with me. :knife:"
      )

      return
    }

    persistentData.locations[message.author.username] = nextRoom
    save()

    lookAtCurrentRoom(message, true)
  }

  if (message.content === "!look") {
    lookAtCurrentRoom(message)
  }
}
