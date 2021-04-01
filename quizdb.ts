import Discord = require("discord.js")
import fetch from "node-fetch"

export const getQuizDbQuestion = async (
  difficulties: string[],
  channel: Discord.TextChannel | Discord.NewsChannel | Discord.DMChannel
): Promise<{ points: number; json: any } | null> => {
  const diffs: { [key: string]: string } = {
    1: "middle_school",
    2: "easy_high_school",
    3: "regular_high_school",
    4: "hard_high_school",
    5: "national_high_school",
    6: "easy_college",
    7: "regular_college",
    8: "hard_college",
  }

  let diffQuery = ""
  let difficulty = 1

  for (const potentialDifficulty of [...difficulties].sort(
    () => Math.random() - 0.5
  )) {
    if (String(potentialDifficulty) in diffs) {
      diffQuery += `&search%5Bfilters%5D%5Bdifficulty%5D%5B%5D=${
        diffs[String(potentialDifficulty)]
      }`
      difficulty = Number(potentialDifficulty)

      break
    }
  }

  if (diffQuery === "") {
    return null
  }

  let pointTable: { [key: number]: number } = {
    1: 10,
    2: 10,
    3: 15,
    4: 15,
    5: 20,
    6: 20,
    7: 25,
    8: 25,
    9: 25,
  }

  let pointsAwarded = pointTable[difficulty] ?? 10

  const res = await fetch(
    `https://www.quizdb.org/api/random?search%5Bquery%5D=${diffQuery}&search%5Blimit%5D=true&search%5Brandom%5D=5`,
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        cookie:
          "_session_id=jXNmJhJ61TFOx3qSpgNLcxMtISIJXlR6qHe5rykLRWaBiLcaGYQl9B2aMGEWfrQKpA%3D%3D--tjHD4EFn5VKu%2FiV7--uFcko2cIKQm4Deh%2Fpjp7pQ%3D%3D; _quizdb_session=wNwMctdqFvzzKg4GYmh0pKvQNlUCNuCbVIkFSDJtHW5UNoRpGrY5twgZGc50ssocjA%3D%3D--GkSllnnP7GchZZGC--Fv8amp06hD9yIh%2FHYGPq%2Fg%3D%3D",
      },
      ["referrer" as any]: "https://www.quizdb.org/",
      ["referrerPolicy" as any]: "strict-origin-when-cross-origin",
      body: null as any,
      method: "GET",
      ["mode" as any]: "cors",
    }
  )

  await channel.send(`Level ${difficulty}, for ${pointsAwarded} points.`)

  return {
    json: await res.json(),
    points: pointsAwarded,
  }
}
