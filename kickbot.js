"use strict";
// TODO
// * daily leaderboard
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.save = exports.persistentData = void 0;
const Discord = require("discord.js");
const chips_tossups_1 = require("./chips_tossups");
const format_answer_1 = require("./format_answer");
const lootbox_1 = require("./lootbox");
const quizdb_1 = require("./quizdb");
const token_json_1 = __importDefault(require("./token.json"));
const fs_1 = __importDefault(require("fs"));
const rpg_1 = require("./rpg");
const client = new Discord.Client();
const config = {
    token: token_json_1.default.token,
    prefix: "!",
};
client.on("ready", () => {
    console.log(`[${new Date().toDateString()}]Kickbot online.`);
    client.user.setPresence({ activity: { name: ":eyes:" } });
});
const sleep = async (ms) => {
    await new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
};
let emojiToConditionCode = {
// "🔪": `return [...msg.content.toLowerCase()].filter((l) => l === "e").length === 2`,
};
const satisfiesCondition = (msg, conditionCode) => {
    try {
        return eval("(msg) => { " + conditionCode + "}")(msg);
    }
    catch (e) {
        console.log(e);
        msg.channel.send(e.toString());
        return false;
    }
};
exports.persistentData = JSON.parse(fs_1.default.readFileSync("save/save.json", "utf-8")) ?? {
    inventories: [],
    scores: [],
};
const save = () => {
    fs_1.default.writeFileSync("save/save.json", JSON.stringify(exports.persistentData));
};
exports.save = save;
let playingTrivia = false;
let givenAnswer = "";
let buzzQueue = [];
let buzzers = [];
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
client.on("message", async (message) => {
    if (message.author.bot) {
        return;
    }
    const msg = message.content;
    rpg_1.handleRpgMessages(message);
    for (const [emoji, code] of Object.entries(emojiToConditionCode)) {
        if (satisfiesCondition(message, code)) {
            await message.react(emoji);
        }
    }
    if (msg.startsWith("!trivia")) {
        if (playingTrivia) {
            await message.channel.send("Already playing trivia! Please wait until I'm done :)");
            return;
        }
        if (message.author.username.toLowerCase() === "lunacyecho") {
            await message.channel.send("GO TO BED LUNY");
        }
        let nums = msg.slice("!trivia".length).split("");
        if (nums.length === 0) {
            nums = ["1"];
        }
        playingTrivia = true;
        let questionMessage = null;
        let pointsAwarded = 10;
        let response;
        if (Math.random() < 0.05) {
            await message.channel.send("**SURPRISE!** CHIPS COMPO TOSSUP TIME!");
            questionMessage = await message.channel.send("Looking for a good question... hmmm");
            response = chips_tossups_1.getChipsTossup();
            pointsAwarded = 15;
        }
        else {
            questionMessage = await message.channel.send("Looking up some trivia... hmm hm hum");
            let result = null;
            try {
                result = await quizdb_1.getQuizDbQuestion(nums, message.channel);
            }
            catch (e) {
                console.log(e);
                await message.channel.send("There was a problem with the trivia db. Try doing !trivia again.");
                playingTrivia = false;
                return;
            }
            if (result === null) {
                await message.channel.send("Stop messing with the trivia bot... or else. :knife: ");
                playingTrivia = false;
                return;
            }
            const { json, points } = result;
            response = json;
            pointsAwarded = points;
        }
        const question = response.data.tossups[0];
        let fullText = question.formatted_text;
        fullText = fullText.split("\u003cstrong\u003e").join("**");
        fullText = fullText.split("\u003c/strong\u003e").join("**");
        fullText = fullText.split("\u003cem\u003e").join("*");
        fullText = fullText.split("\u003c/em\u003e").join("*");
        const officialAnswer = format_answer_1.formatAnswer(question.answer);
        let remainingWords = fullText.split(" ");
        let partialAnswerText = "";
        let correctAnswerer;
        let count = 0;
        buzzQueue = [];
        buzzers = [];
        let someoneAnsweredCorrectly = false;
        outer: while (remainingWords.length > 0) {
            partialAnswerText += remainingWords.shift() + " ";
            count++;
            if (count > 4) {
                count = 0;
                await questionMessage.edit(partialAnswerText);
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
            if (remainingWords.length <= 4) {
                partialAnswerText += remainingWords.join(" ");
                remainingWords = [];
                await questionMessage.edit(partialAnswerText);
                // Final pause before giving away the answer
                for (let i = 0; i < 4; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    if (buzzQueue.length > 0) {
                        break;
                    }
                }
                if (buzzQueue.length === 0) {
                    break;
                }
            }
            const tickTockMessageText = (seconds) => {
                if (buzzQueue.length === 1) {
                    return `BUZZ! ${buzzQueue[0].user.username}, you have ${seconds} seconds to give an answer.`;
                }
                else {
                    return `BUZZ! ${buzzQueue[0].user.username}, you have ${seconds} seconds to give an answer.
Next up is ${buzzQueue
                        .slice(1)
                        .map((b) => b.user.username)
                        .join(", ")}`;
                }
            };
            while (buzzQueue.length > 0) {
                const tickTockMessage = await message.channel.send(tickTockMessageText(8));
                givenAnswer = "";
                partialAnswerText += ` **BUZZ** (${buzzQueue[0].user.username}) `;
                let secondsLeft = 8;
                await new Promise((resolve) => {
                    setInterval(() => {
                        if (givenAnswer) {
                            return resolve();
                        }
                        if (secondsLeft < 0) {
                            return resolve();
                        }
                        secondsLeft -= 2;
                        tickTockMessage.edit(tickTockMessageText(secondsLeft));
                    }, 2000);
                });
                let result = format_answer_1.isAnswerCorrect(givenAnswer, officialAnswer);
                if (result === "correct") {
                    await message.channel.send("Correct!");
                    exports.persistentData.scores[buzzQueue[0].user.username] =
                        (exports.persistentData.scores[buzzQueue[0].user.username] || 0) +
                            pointsAwarded;
                    exports.save();
                    someoneAnsweredCorrectly = true;
                    correctAnswerer = buzzQueue[0].user;
                }
                else if (result === "prompt") {
                    await message.channel.send(`Prompt`);
                }
                else if (result === "prompt-of") {
                    await message.channel.send(givenAnswer.trim() + " of ... ?");
                }
                else {
                    await message.channel.send(`That's probably wrong.`);
                    someoneAnsweredCorrectly = false;
                }
                if (someoneAnsweredCorrectly) {
                    break outer;
                }
                buzzQueue.shift();
            }
        }
        partialAnswerText += remainingWords.join(" ");
        await questionMessage.edit(partialAnswerText);
        let answer = "";
        if (!someoneAnsweredCorrectly) {
            answer =
                "No one got it! The answer was:`" +
                    question.answer +
                    "` (If something seems wrong, ping johnfn.)";
        }
        else {
            answer = "**Full answer**: `" + question.answer + "`";
        }
        let leaderboardMessage = answer + "\n\n**Leaderboard:**\n```";
        for (const name of Object.keys(exports.persistentData.scores)) {
            leaderboardMessage +=
                name +
                    new Array(20 - name.length).fill(" ").join("") +
                    exports.persistentData.scores[name] +
                    " points.\n";
        }
        if (Object.keys(exports.persistentData.scores).length === 0) {
            leaderboardMessage += "No leaderboard because you all suck.";
        }
        leaderboardMessage += "```";
        await message.channel.send(leaderboardMessage);
        if (Math.random() > 0.9 && correctAnswerer) {
            await lootbox_1.loot(correctAnswerer, message.channel);
        }
        playingTrivia = false;
    }
    if (message.content.toLowerCase() === "!loottesting") {
        await lootbox_1.loot(message.author, message.channel);
    }
    if (message.content.toLowerCase() === "!inventory") {
        const myInventory = exports.persistentData.inventories[message.author.username] ?? [];
        const myPoints = exports.persistentData.scores[message.author.username] ?? 0;
        if (myInventory.length === 0) {
            await message.channel.send("Inventory:\n\n```" + `${myPoints} points` + "```");
        }
        else {
            await message.channel.send("Inventory:\n\n```" +
                `${myPoints} points\n` +
                myInventory.join("\n") +
                "```\n\nInspect an item with `!inspect [item name]`.");
        }
    }
    if (message.content.toLowerCase().startsWith("!inspect")) {
        const inspectedItem = message.content.split(" ").slice(1).join(" ");
        const myInventory = exports.persistentData.inventories[message.author.username] ?? [];
        if (!myInventory.find((item) => item.toLowerCase() === inspectedItem.toLowerCase())) {
            await message.channel.send(`You don't have an item named ${inspectedItem} in your inventory!\n\nUse \`!inventory\` to see the contents of your inventory.`);
            return;
        }
        for (const [name, desc] of Object.entries(lootbox_1.lootDescriptions)) {
            if (name.toLowerCase() === inspectedItem.toLowerCase()) {
                await message.channel.send(`\`${name}\`\n\n${desc}`);
                return;
            }
        }
    }
    if (message.content.toLowerCase().startsWith("buzz") && playingTrivia) {
        if (buzzers.find((b) => b.username === message.author.username)) {
            await message.channel.send(`You've already buzzed for this question, ${message.author.username}! You can only buzz once per question.`);
            return;
        }
        buzzQueue.push({
            user: message.author,
        });
        buzzers.push(message.author);
        return;
    }
    if (playingTrivia &&
        buzzQueue.length > 0 &&
        message.author.username.toLowerCase() ===
            buzzQueue[0].user.username.toLowerCase()) {
        givenAnswer = message.content;
    }
    if (message.content.startsWith("!newcondition")) {
        let emoji = message.content.split(" ")[1];
        const code = message.content.slice(message.content.indexOf("```") + 3, message.content.lastIndexOf("```"));
        emojiToConditionCode[emoji] = code;
        await message.channel.send("Hi! Updating my condition for " + emoji + " to ```" + code + "```");
    }
    if ((message.content.toLowerCase().startsWith("i'm ") ||
        message.content.toLowerCase().startsWith("im ")) &&
        Math.random() > 0.7) {
        const r = Math.floor(Math.random() * 10);
        if (r === 0) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! I'm bot :slight_smile: ");
        }
        else if (r === 1) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! egg! ");
        }
        else if (r === 2) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! Nice to meet you! I'm bot. ");
        }
        else if (r === 3) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! :slight_smile: ");
        }
        else if (r === 4) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! You know what im gonna say next ");
        }
        else if (r === 5) {
            const m = await message.channel.send("Hi " +
                msg.slice(3).trim() +
                "! You know what im gonna say next :slight_smile:");
        }
        else if (r === 6) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! I'm scrambie! no wait...");
        }
        else if (r === 7) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "! I'm bot! beep boop im a robot");
        }
        else if (r === 8) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "!!! >:D ");
        }
        else if (r === 9) {
            const m = await message.channel.send("Hi " + msg.slice(3).trim() + "!!! I'm bot");
        }
    }
    if (message.content.toLowerCase().startsWith("hi ") &&
        message.content.length > 5) {
        const words = message.content.split(" ");
        const newName = words.slice(1).join(" ") ?? "";
        try {
            message.guild?.me?.setNickname(newName.slice(0, 31));
            const m = await message.channel.send(`hi ${message.author.username}! thanks for greeting me :slight_smile: `);
        }
        catch (e) {
            console.log(e);
        }
    }
    if (message.content.indexOf(config.prefix) !== 0) {
        return;
    }
});
const start = async () => {
    const c = await client.login(config.token);
};
start();
