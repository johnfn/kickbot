"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChipsTossup = void 0;
let chipsTossups = [
    {
        data: {
            tossups: [
                {
                    formatted_text: "This user of Discord has an animal-themed profile picture with a pastel color scheme. For 10 points, name this Chips Compo user who should go to sleep.",
                    answer: "LunacyEcho",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `This Chips Compo user has submitted many songs to the site, including "Rolling Down" to Chips Compo 2. On Discord, this user has a picture with a subtle checkerboard background; on the website, their avatar is an animated gif of a cartoon character. For 10 points, name this musician and author of the winning track to Audio Secret Santa 2021, Nadir [for Albe].`,
                    answer: "1f1n1ty",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `This Chips Compo user has submitted many entries to the site, including "Where it All Started" to PUNCOMPO. On Discord, this user used to have a cartoon picture of a cat who's shape subtly alluded to this user's username. For 10 points, name this musician and author of the winning track to Chips Compo 15, 4B-R05.`,
                    answer: "Miyolophone",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `This Chips Compo user has submitted many, many entries to the site, including "Quest for the Cryptic Chip" to Chips Compo 6. This user posted 'Anyone else listening to this in 2021?' as a comment to the song Crazy Colors. This musician was the author of "The Jester Affair". For 10 points, name this musician on Chips Compo with the most experience of anyone on the site.`,
                    answer: "BlueOceans",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `This song begins with a vocal sample of someone saying "yeah" in various ways over jazz piano and double bass. It then moves into glitch hop and IDM. This song was the winning entry of the Chips Cacaophony Round 3. For 10 points, name this song by silentscience with a self-referential name.`,
                    answer: "Title",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `This track's tags include 'holy moly', 'jazz chords', and 'crash bandicoot'. The typewriter ding that plays right before this song's first drop was one of only 5 samples it could use for the compo it won, which was the second SAMPLE PACK Salsa Compo. At the end of the public release of this track, a solo male voice glitches out while saying the title two-word phrase. For 10 points, name this song with more comments than any other on the site, a glitch hop track by Zelgeon.`,
                    answer: "Just Kidding",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `The tags for this Chips Compo entry include '69/420 production needs more sausage fattener' and 'Fl keys'. This song scored a 1.09 in overall, which got it the lowest score in SAIM Compo - a full point behind the second-to-last entry. This entry has one of the busiest comment sections on the Chips Compo site, with 52 as of March 30, 2021. For 10 points, name this meme song by Hallow, BlueOceans, I0ta, TheBetterTheBetterAudioPortal, evan and noteva, referring to an impossible action done to a keyboard-like instrument.`,
                    answer: "Cranking My Piano",
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `These two words begin the title of a written entry that contains a list of introductory statements like "it's the SAFF MAN" and "hey look, saffy!" Skye provided the vocals for Sara, a character in a song whose title begins with these two words that BlueOceans submitted to the "Big Dance" compo. These two words begin the title of a MegaSphere remix that ends with airhorns playing the main melody of (*) "Mermaid". In a song beginning with these two words, alternating saxophone and violin melodies represent two students, one of whom is stuck in a time loop. For 10 points, name these two words that begin the first song to win 1st place in every category in a major compo, a six-part song by Miyolophone.`,
                    answer: `how to [accept How to greet a Saffy; accept How to Have a Perfect Dance; accept How to Ruin Mermaid; accept How to Have a Perfect Day]`,
                },
            ],
        },
    },
    {
        data: {
            tossups: [
                {
                    formatted_text: `At about 16 minutes into "kill bill vol. 1", a beatshifted remix of this song plays. big ol yoink's only submission to the "Vocal Compo: Stems" compo was a "very serious" cover of this song. A stretched version of Kricketune's cry begins a remix of this song made with Pokemon cries submitted to Salsa Compo 6. In a choose-your-own-adventure track by Miyolophone, the "original Dingle single" is actually a parody of this song that includes lines like (*) "only first place trophies don't get old" and "I ain't the smartest bot in the age". "digital_love [IMPROVED VOCALS]" and - considered by some to be the best song ever submitted to Chips - "out of orstar" are among the many LunacyEcho remixes of, for some points, what hit song by Smash Mouth?`,
                    answer: `All Star [accept very serious all star cover; accept literally all star]`,
                },
            ],
        },
    },
];
const getChipsTossup = () => {
    return chipsTossups[Math.floor(Math.random() * chipsTossups.length)];
};
exports.getChipsTossup = getChipsTossup;
