import Discord = require("discord.js")
import { getChipsTossup } from "./chips_tossups"
import { formatAnswer, isAnswerCorrect, OfficialAnswer } from "./format_answer"
import { persistentData, save, sleep } from "./kickbot"
import { loot } from "./lootbox"
import { getQuizDbQuestion } from "./quizdb"

export let playingTrivia = false
let buzzQueue: {
  user: Discord.User
  type: "buzz" | "prompt"
  tries: number
  answer?: string
}[] = []
let buzzers: Discord.User[] = []

export const getTickTockMessageText = (
  seconds: number,
  typeOfRequest: "buzz" | "prompt"
) => {
  let message = `${typeOfRequest === "buzz" ? "BUZZ!" : "CLOSE!"} ${
    buzzQueue[0].user.username
  }, you have ${seconds} seconds to give an answer.`

  if (buzzQueue.length > 0) {
    const remainingQueue = buzzQueue
      .slice(1)
      .map((b) => b.user.username)
      .join(", ")

    message += `\nNext up: ${remainingQueue}`
  }

  return message
}

export const handleTriviaMessages = async (message: Discord.Message) => {
  const content = message.content

  if (content.startsWith("!trivia")) {
    if (playingTrivia) {
      await message.channel.send(
        "Already playing trivia! Please wait until I'm done :)"
      )

      return
    }

    if (message.author.username.toLowerCase() === "lunacyecho") {
      await message.channel.send("GO TO BED LUNY")
    }

    let nums = content.slice("!trivia".length).split("")
    if (nums.length === 0) {
      nums = ["1"]
    }

    playingTrivia = true

    let questionMessage: Discord.Message | null = null
    let pointsAwarded: number = 10
    let response: any

    if (Math.random() < 0.05) {
      await message.channel.send("**SURPRISE!** CHIPS COMPO TOSSUP TIME!")

      questionMessage = await message.channel.send(
        "Looking for a good question... hmmm"
      )

      response = getChipsTossup()

      pointsAwarded = 15
    } else {
      questionMessage = await message.channel.send(
        "Looking up some trivia... hmm hm hum"
      )

      let result: { points: number; json: string } | null = null
      try {
        result = await getQuizDbQuestion(nums, message.channel)
      } catch (e) {
        console.log(e)
        await message.channel.send(
          "There was a problem with the trivia db. Try doing !trivia again."
        )
        playingTrivia = false

        return
      }

      if (result === null) {
        await message.channel.send(
          "Stop messing with the trivia bot... or else. :knife: "
        )

        playingTrivia = false
        return
      }

      const { json, points } = result

      response = json
      pointsAwarded = points
    }

    const question = response.data.tossups[0]

    let fullText: string = question.formatted_text

    fullText = fullText.split("\u003cstrong\u003e").join("**")
    fullText = fullText.split("\u003c/strong\u003e").join("**")
    fullText = fullText.split("\u003cem\u003e").join("*")
    fullText = fullText.split("\u003c/em\u003e").join("*")

    const officialAnswer = formatAnswer(question.answer)
    let remainingWords = fullText.split(" ")
    let partialAnswerText = ""
    let correctAnswerer: Discord.User | undefined

    buzzQueue = []
    buzzers = []
    let answerStatus: "not-answered-correctly" | "answered-correctly" =
      "not-answered-correctly"

    while (
      remainingWords.length > 0 &&
      answerStatus !== "not-answered-correctly"
    ) {
      for (let i = 0; i < 4 && remainingWords.length > 0; i++) {
        partialAnswerText += remainingWords.shift() + " "
      }

      await sleep(1500)

      for (const buzzer of buzzQueue) {
        partialAnswerText += ` **BUZZ** (${buzzer.user.username}) `
      }

      await questionMessage.edit(partialAnswerText)

      answerStatus = await consumeBuzzQueue(
        message,
        officialAnswer,
        pointsAwarded
      )
    }

    // Final grace period for buzzes

    while (answerStatus !== "answered-correctly") {
      await sleep(5000)

      if (buzzQueue.length > 0) {
        answerStatus = await consumeBuzzQueue(
          message,
          officialAnswer,
          pointsAwarded
        )
      } else {
        break
      }
    }

    partialAnswerText += remainingWords.join(" ")

    await questionMessage.edit(partialAnswerText)
    await showLeaderboardAndAnswer(question, message)

    if (Math.random() > 0.9 && correctAnswerer) {
      await loot(correctAnswerer, message.channel)
    }

    playingTrivia = false
  }

  if (
    playingTrivia &&
    buzzQueue.length > 0 &&
    message.author.username.toLowerCase() ===
      buzzQueue[0].user.username.toLowerCase()
  ) {
    buzzQueue[0].answer = message.content
  }

  if (message.content.toLowerCase().startsWith("buzz") && playingTrivia) {
    if (buzzers.find((b) => b.username === message.author.username)) {
      await message.channel.send(
        `You've already buzzed for this question, ${message.author.username}! You can only buzz once per question.`
      )

      return
    }

    buzzQueue.push({
      user: message.author,
      tries: 0,
      type: "buzz",
    })
    buzzers.push(message.author)

    return
  }
}

const getAnswerFromTopBuzzedUser = async (
  message: Discord.Message
): Promise<string | null> => {
  const tickTockMessage = await message.channel.send(
    getTickTockMessageText(8, buzzQueue[0].type)
  )

  const result = await Promise.race([
    new Promise<string>((resolve) =>
      setInterval(() => {
        if (buzzQueue[0].answer) resolve(buzzQueue[0].answer)
      })
    ),

    new Promise<null>(async (resolve) => {
      for (let i = 0; i < 4; i++) {
        await sleep(2000)

        tickTockMessage.edit(
          getTickTockMessageText(8 - i * 2, buzzQueue[0].type)
        )
      }

      resolve(null)
    }),
  ])

  if (result === null) {
    await tickTockMessage.edit("Time's up - no answer!")
  }

  return result
}

const consumeBuzzQueue = async (
  message: Discord.Message,
  officialAnswer: OfficialAnswer,
  pointsAwarded: number
): Promise<"answered-correctly" | "not-answered-correctly"> => {
  while (buzzQueue.length > 0) {
    buzzQueue[0].tries++

    if (buzzQueue[0].tries > 3) {
      await message.channel.send(`Sorry, that's too many tries!`)

      buzzQueue.shift()
      continue
    }

    const providedAnswer = await getAnswerFromTopBuzzedUser(message)

    if (providedAnswer) {
      let result = isAnswerCorrect(providedAnswer, officialAnswer)

      if (result === "correct") {
        await message.channel.send("Correct!")

        persistentData.scores[buzzQueue[0].user.username] =
          (persistentData.scores[buzzQueue[0].user.username] || 0) +
          pointsAwarded

        save()

        return "answered-correctly"
      } else if (result === "prompt") {
        await message.channel.send(`Close! Give me something more specific`)
      } else if (result === "prompt-of") {
        await message.channel.send(providedAnswer.trim() + " of ... ?")
      } else {
        await message.channel.send(`That's probably wrong.`)

        buzzQueue.shift()
      }
    } else {
      buzzQueue.shift()
    }
  }

  return "not-answered-correctly"
}

const showLeaderboardAndAnswer = async (
  question: any,
  message: Discord.Message
) => {
  let answer = ""

  if (buzzQueue.length === 0) {
    answer =
      "No one got it! The answer was:`" +
      question.answer +
      "` (If something seems wrong, ping johnfn.)"
  } else {
    answer = "**Full answer**: `" + question.answer + "`"
  }

  let leaderboardMessage = answer + "\n\n**Leaderboard:**\n```"

  for (const name of Object.keys(persistentData.scores)) {
    leaderboardMessage +=
      name +
      new Array(20 - name.length).fill(" ").join("") +
      persistentData.scores[name] +
      " points.\n"
  }

  if (Object.keys(persistentData.scores).length === 0) {
    leaderboardMessage += "No leaderboard because you all suck."
  }

  leaderboardMessage += "```"

  await message.channel.send(leaderboardMessage)
}
