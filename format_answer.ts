// i need to have it extend the grace period after a buzz after the end of the Q
// if it's wrong and spelled wrong i'll just prompt for you to type it correctly
// The right answer was Jean Auguste Dominique <strong>Ingres</strong> &lt;Visual Arts, GY&gt;&lt;ed. AH&gt;
// i shuold add a feature for adding new trivia questions

var dictionary = require("dictionary-en")
import NSpell from "nspell"

dictionary(onLoadDictionary)

let nspell: NSpell | undefined = undefined

export const attemptToNormalizeString = (ans: string): string => {
  ans = ans.toLowerCase()

  // Remove any attribution

  if (ans.includes("&lt;")) {
    ans = ans.slice(0, ans.indexOf("&lt;")).trim()
  }

  if (ans.includes("&gt;")) {
    ans = ans.slice(0, ans.indexOf("&gt;")).trim()
  }

  let lastSquareClose = ans.lastIndexOf("]")
  let lastSquareOpen = ans.lastIndexOf("[")
  let lastParenClose = ans.lastIndexOf(")")
  let lastParenOpen = ans.lastIndexOf("(")

  // Remove the last pair
  if (lastParenClose !== -1 || lastSquareClose !== -1) {
    if (lastParenClose > lastSquareClose) {
      ans =
        ans.substring(0, lastParenOpen) +
        ans.substring(lastParenOpen).split("(").join("").split(")").join("")
    } else {
      ans =
        ans.substring(0, lastSquareOpen) +
        ans.substring(lastSquareOpen).split("[").join("").split("]").join("")
    }
  }

  ans = ans.split("<strong>").join("")
  ans = ans.split("</strong>").join("")

  ans = ans.replace("answer:", "")

  ans = ans.trim()

  ans = ans.replace("accept word forms;", "") // RIP
  ans = ans.replace("accept word forms,", "") // RIP
  ans = ans.replace("accept answers like", "accept")
  ans = ans.replace(/also accept/g, "accept")
  ans = ans.replace(/before read/g, "")
  ans = ans.replace("do not accept or prompt", "DNA")
  ans = ans.replace(/ or/g, " accept")
  ans = ans.replace(/or /g, "accept ")
  ans = ans.replace("do not accept", "DNA")

  // Yes, they are different!!!
  ans = ans.replace(/“/g, "")
  ans = ans.replace(/”/g, "")

  ans = ans.replace(/"/g, "")
  ans = ans.replace(/  /g, " ")
  ans = ans.replace(/;/g, "")

  ans = ans.replace(/prompt on/g, "prompt")

  // just ignore "before xxx" entirely.
  // i need some test cases here

  const words = ans.split(" ")
  ans = ""
  let before = false

  for (const word of words) {
    if (word === "before") {
      before = true
      continue
    }

    if (word === "accept" || word === "prompt") {
      before = false
    }

    if (!before) {
      ans += word + " "
    }
  }

  ans = ans.trim()

  return ans
}

export const formatAnswer = (
  ans: string
): { answer: string; alternatives?: string[]; prompts?: string[] } => {
  ans = attemptToNormalizeString(ans)

  let alternatives: string[] = []
  let prompts: string[] = []
  let mode: "alts" | "prompts" | "do not accept" = "alts"
  let currentPhrase = ""

  let words = ans.split(" ")

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const nextWord = words[i + 1]

    if (word === "or" || word === "accept") {
      mode = "alts"
      continue
    }

    if (
      word.endsWith(";") ||
      word.endsWith(":") ||
      word.endsWith(",") ||
      word.endsWith(".")
    ) {
      currentPhrase += " " + word.slice(0, -1)
    } else {
      currentPhrase += " " + word
    }

    // done with current segment?
    if (
      word.endsWith(";") ||
      word.endsWith(":") ||
      word.endsWith(",") ||
      word.endsWith(".") ||
      nextWord === "accept" ||
      nextWord === "prompt" ||
      nextWord === "DNA" ||
      !nextWord
    ) {
      if (mode === "alts") {
        alternatives.push(currentPhrase.trim())
      } else if (mode === "prompts") {
        prompts.push(currentPhrase.trim())
      }

      currentPhrase = ""
    }

    if (word === "DNA") {
      mode = "do not accept"
    }

    if (word === "prompt") {
      mode = "prompts"
    }
  }

  alternatives = alternatives
    .map((a) => {
      if (a.startsWith("accept ")) {
        return a.slice("accept ".length)
      }

      return a
    })
    .filter((a) => a.trim() !== "")

  prompts = prompts
    .map((a) => {
      if (a.startsWith("prompt ")) {
        return a.slice("prompt ".length)
      }

      return a
    })
    .filter((a) => a.trim() !== "")

  return {
    answer: ans,
    alternatives: alternatives,
    prompts: prompts,
  }
}

const getEditDistance = (a: string, b: string) => {
  if (a.length == 0) return b.length
  if (b.length == 0) return a.length

  let matrix = []

  // increment along the first column of each row
  let i
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // increment each column in the first row
  let j
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1
          )
        ) // deletion
      }
    }
  }

  return matrix[b.length][a.length]
}

const equalOrMinorTypo = (given: string, answer: string) => {
  // If they didnt spell it wrong, don't even try.
  if (nspell?.correct(given)) {
    return given === answer
  }

  const dist = getEditDistance(given, answer)

  return (
    // same word
    given === answer ||
    // words are long enough to have meaningful edit distance and are close enough
    (given !== answer && (given.length > 2 || answer.length > 2) && dist < 2) ||
    (given !== answer && (given.length >= 6 || answer.length >= 6) && dist < 3)
  )
}

export const areWordsRoughlyEqual = (given: string, answer: string) => {
  const givenWords = given.split(" ")
  const answerWords = answer.split(" ")

  if (
    givenWords.length === answerWords.length &&
    givenWords.every((w, i) => equalOrMinorTypo(givenWords[i], answerWords[i]))
  ) {
    return true
  }

  // Be generous with plurals

  if (
    given.endsWith("s") &&
    !answer.endsWith("s") &&
    equalOrMinorTypo(given.slice(0, -1), answer)
  ) {
    return true
  }

  if (
    !given.endsWith("s") &&
    answer.endsWith("s") &&
    equalOrMinorTypo(answer.slice(0, -1), given)
  ) {
    return true
  }

  if (equalOrMinorTypo("the " + given, answer)) {
    return true
  }

  if (equalOrMinorTypo(given, "the " + answer)) {
    return true
  }

  if (equalOrMinorTypo("a " + given, answer)) {
    return true
  }

  if (equalOrMinorTypo(given, "a " + answer)) {
    return true
  }

  if (equalOrMinorTypo("an " + given, answer)) {
    return true
  }

  if (equalOrMinorTypo(given, "an " + answer)) {
    return true
  }

  // For last names specifically
  for (const word of answer.split(" ")) {
    if (equalOrMinorTypo(word, given)) {
      return true
    }
  }

  return false
}

export const isAnswerCorrect = (
  given: string,
  official: {
    answer: string
    alternatives?: string[] | undefined
    prompts?: string[] | undefined
  }
): "correct" | "prompt" | "prompt-of" | "no" => {
  given = given.toLowerCase()
  let officialAnswers = [official.answer, ...(official.alternatives ?? [])]
  let prompts = official.prompts ?? []

  for (let candidateAnswer of officialAnswers) {
    if (areWordsRoughlyEqual(given, candidateAnswer)) {
      return "correct"
    }
  }

  for (let prompt of prompts) {
    if (areWordsRoughlyEqual(given, prompt)) {
      return "prompt"
    }
  }

  for (let candidateAnswer of officialAnswers) {
    if (candidateAnswer.startsWith(given)) {
      if (candidateAnswer.startsWith(given.trim() + " of")) {
        return "prompt-of"
      } else {
        if (candidateAnswer.split(" ").length >= 2) {
          return "correct"
        } else {
          return "prompt"
        }
      }
    }
  }

  return "no"
}

const test = (
  officialAnswer: string,
  givenAnswer: string,
  expected: "correct" | "prompt" | "no" | "prompt-of" = "correct"
) => {
  const obj = formatAnswer(officialAnswer)
  const result = isAnswerCorrect(givenAnswer, obj)

  if (expected === result) {
    return true
  } else {
    console.log(obj)
    throw new Error(`Got ${result} wanted ${expected}`)
  }
}

function onLoadDictionary(err: any, dict: any) {
  if (err) {
    throw err
  }

  nspell = NSpell(dict)

  test("Answer: The Legend of Zelda [prompt on Zelda]", "Legend of zelda")
  test("Answer: The Legend of Zelda [prompt on Zelda]", "The Legend of zelda")
  test("Answer: The Legend of Zelda [prompt on Zelda]", "Legend of zelda")
  test("cats", "cat")
  test("Artemis [accept Diana] &lt;Mythology — Dai&gt; [Ed. French]", "Artemis")
  test("Artemis [accept Diana] &lt;Mythology — Dai&gt; [Ed. French]", "Diana")
  test(
    "Jean Auguste Dominique <strong>Ingres</strong> &lt;Visual Arts, GY&gt;&lt;ed. AH&gt;",
    "Ingres"
  )
  test(
    "Jean Auguste Dominique <strong>Ingres</strong> &lt;Visual Arts, GY&gt;&lt;ed. AH&gt;",
    "jean auguste dominique ingres"
  )
  test(
    "Answer: capital punishment (or the death penalty, execution, or equivalents; prompt on lethal injection before mentioned)",
    "death penalty"
  )
  test(
    "Answer: capital punishment (or the death penalty, execution, or equivalents; prompt on lethal injection before mentioned)",
    "the death penalty"
  )
  test(
    "Answer: capital punishment (or the death penalty, execution, or equivalents; prompt on lethal injection before mentioned)",
    "execution"
  )
  test(
    "Answer: capital punishment (or the death penalty, execution, or equivalents; prompt on lethal injection before mentioned)",
    "lethal injection",
    "prompt"
  )

  test(
    "Answer: Madame Butterfly or Madama Butterfly (accept Cio-Cio San)",
    "madame butterfly"
  )

  test(
    "Answer: Madame Butterfly or Madama Butterfly (accept Cio-Cio San)",
    "madama butterfly"
  )

  test('Answer: rectangles [do not accept or prompt on "square"]', "rectangle")
  test(
    "Answer: Avogadro's number or Avogadro's constant. (prompt on 6.02 times 1023 before mentioned)",
    "Avogadro's constant"
  )
  test(
    "Answer: God [prompt on answers like divinity, the deity, or divine will] &lt;JB Philosophy&gt;",
    "god"
  )
  test(
    "Answer: God [prompt on answers like divinity, the deity, or divine will] &lt;JB Philosophy&gt;",
    "gd"
  )
  test(
    "Answer: God [prompt on answers like divinity, the deity, or divine will] &lt;JB Philosophy&gt;",
    "f",
    "no"
  )

  test("Marcus Aurelius Antoninus Augustus", "marcus aurelius", "correct")

  test("New York City", "New York", "correct")

  // (Great) Irish Potato Famine (accept any answer that describes hunger in Ireland related to bad potatoes, though "Irish" is not needed after "Ireland" is mentioned; prompt on partial answer)

  test("Static friction", "static")
  test("New York City", "New York", "correct")
  test("Vice President of the United States", "Vice President", "prompt-of")
  test("North Dakota", "South Dakota", "no")
  test("Eiffel", "effiel")

  test("C(live) S(taples) Lewis", "C S Lewis")

  // test("Mario Vargas Llosa", "vargas llosa")
}

// neutron should not be accepted for neutrino

// test("Fyodor Dostoevsky", "Dostoyevsky")

// "Answer: C(live) S(taples) Lewis (prompt on “Lewis” alone)",
// "Oroonoko: or, the Royal Slave",

// "Theodore "Teddy" Roosevelt (prompt on "Roosevelt" alone)"
// Teddy Roosvelt

// Franz (Uri) Boas &lt;CL&gt;

// Franz Liszt's etudes [accept "studies" instead of "etudes"; be generous, and accept Transcendental Etudes or Ã‰tudes d'exÃ©cution transcendante or Grand Paganini Etudes or Grandes Ã©tudes de Paganini, even though not all of the etudes clued are from the same collection]
// Liszt for the above

// "Washington, DC"

// "Robert Lee Frost", "Robert Frost"

// 'north dakota' accepted for 'south dakota'

// Umayyad Dynasty or Caliphate

// eruption, volcanic eruptions (accept volcano events)

// Mario Vargas Llosa, vargas llosa

// Pablo (Diego JosÃ© Francisco de Paula Juan Nepomuceno MarÃ­a de los Remedios Cipriano de la SantÃ­sima Trinidad Ruiz y) Picasso
// Pablo Picasso

// was:Lewis &amp; Clark Expedition (accept equivalents, both names required)

const eqOrThrow = (a: string, b: string) => {
  if (a && b && a.toLowerCase().trim() !== b.toLowerCase().trim()) {
    console.log(a)
    console.log(b)
    throw new Error("not equal, got: " + a)
  }
}

eqOrThrow(
  attemptToNormalizeString(
    "RNAs [or ribonucleic acids; prompt on nucleic acids; accept tRNAs or transfer RNAs or]"
  ),
  "RNAs accept ribonucleic acids prompt nucleic acids accept tRNAs accept transfer RNAs accept"
)
eqOrThrow(
  attemptToNormalizeString("Jerome David Salinger"),
  "Jerome David Salinger"
)
eqOrThrow(attemptToNormalizeString("Pulsars"), "pulsars")
eqOrThrow(
  attemptToNormalizeString(
    "The Hunchback of Notre Dame [or Notre-Dame de Paris]"
  ),

  "The Hunchback of Notre Dame accept Notre-Dame de Paris"
)
eqOrThrow(attemptToNormalizeString("cows"), "cows")
eqOrThrow(
  attemptToNormalizeString(
    "Artemis [accept Diana] &lt;Mythology — Dai&gt; [Ed. French]"
  ),
  "Artemis accept diana"
)
eqOrThrow(attemptToNormalizeString("alcohols"), "alcohols")

eqOrThrow(
  attemptToNormalizeString("fluorine [accept F before read]"),
  "fluorine accept f"
)

eqOrThrow(
  attemptToNormalizeString("George Corley Wallace Jr."),
  "george corley wallace jr."
)
eqOrThrow(
  attemptToNormalizeString(
    "Supreme Court justice [prompt on “justice”] &lt;AB&gt;"
  ),
  "Supreme Court justice prompt justice"
)
eqOrThrow(
  attemptToNormalizeString("apples [accept golden apples]"),
  "apples accept golden apples"
)
eqOrThrow(
  attemptToNormalizeString(
    'small intestine [accept ileum before "chyme" is read]'
  ),
  "small intestine accept ileum"
)
eqOrThrow(attemptToNormalizeString("Hera"), "hera")
eqOrThrow(attemptToNormalizeString("spinal cord"), "spinal cord")
eqOrThrow(attemptToNormalizeString("Indonesia"), "indonesia")
eqOrThrow(
  attemptToNormalizeString(
    "Sandro Botticelli [or Alessandro di Mariano di Vanni Filipepi]"
  ),
  "Sandro Botticelli accept Alessandro di Mariano di Vanni Filipepi"
)
eqOrThrow(
  attemptToNormalizeString(
    "Battle of Trafalgar &lt;JG, European/British History&gt;"
  ),
  "Battle of Trafalgar"
)
eqOrThrow(
  attemptToNormalizeString(
    'neoconservatism [accept word forms; do not accept or prompt on "conservatism"]'
  ),
  "neoconservatism DNA on conservatism"
)
eqOrThrow(attemptToNormalizeString("Egypt"), "egypt")
eqOrThrow(
  attemptToNormalizeString(
    "Constantine I [accept Constantine the Great; prompt on Constantine] &lt;Other History, DC&gt;&lt;ed. AH&gt;"
  ),
  "Constantine I accept Constantine the Great prompt Constantine"
)
eqOrThrow(
  attemptToNormalizeString("Francisco JosÃ© de Goya y Lucientes"),
  "Francisco JosÃ© de Goya y Lucientes"
)
eqOrThrow(
  attemptToNormalizeString("function [or method; or procedure; or subroutine]"),
  "function accept method accept procedure accept subroutine"
)
eqOrThrow(
  attemptToNormalizeString("Winston Leonard Spencer-Churchill"),
  "Winston Leonard Spencer-Churchill"
)
eqOrThrow(attemptToNormalizeString("volume &lt;MS&gt;"), "volume")
eqOrThrow(attemptToNormalizeString("Colorado"), "Colorado")
eqOrThrow(attemptToNormalizeString("The Fray"), "The Fray")
eqOrThrow(
  attemptToNormalizeString("Charlotte Bronte [accept Currer Bell]"),
  "Charlotte Bronte accept Currer Bell"
)
eqOrThrow(
  attemptToNormalizeString("Emily Elizabeth Dickinson"),
  "Emily Elizabeth Dickinson"
)
eqOrThrow(
  attemptToNormalizeString(
    "seeds [prompt on embryos; prompt on fruit] &lt;JR&gt;"
  ),
  "seeds prompt embryos prompt fruit"
)
eqOrThrow(
  attemptToNormalizeString(
    "The Ring Cycle [or The Ring of the Nibelungs; or Der Ring des Nibelungen]"
  ),
  "The Ring Cycle accept The Ring of the Nibelungs accept Der Ring des Nibelungen"
)

eqOrThrow(
  attemptToNormalizeString("Joan of Arc or Jeanne d'Arc"),
  "Joan of Arc accept Jeanne d'Arc"
)
eqOrThrow(attemptToNormalizeString("Stanley Milgram"), "Stanley Milgram")
eqOrThrow(
  attemptToNormalizeString("The Republic [or Politeia]"),
  "The Republic accept Politeia"
)
eqOrThrow(
  attemptToNormalizeString("Humphrey DeForest Bogart"),
  "Humphrey DeForest Bogart"
)
eqOrThrow(attemptToNormalizeString("Electrons"), "Electrons")
eqOrThrow(attemptToNormalizeString("I and the Village"), "I and the Village")
eqOrThrow(attemptToNormalizeString("Paradise Lost"), "Paradise Lost")

eqOrThrow(
  attemptToNormalizeString(
    "Mexico [or United Mexican States; or Estados Unidos Mexicanos]"
  ),
  "Mexico accept United Mexican States accept Estados Unidos Mexicanos"
)
eqOrThrow(
  attemptToNormalizeString("the square root of 674 units"),
  "the square root of 674 units"
)
eqOrThrow(
  attemptToNormalizeString("United Kingdom [or Great Britain]"),
  "United Kingdom accept Great Britain"
)
eqOrThrow(
  attemptToNormalizeString(
    "Night of the Long Knives [or Nacht der langen Messer]"
  ),
  "Night of the Long Knives accept Nacht der langen Messer"
)

eqOrThrow(attemptToNormalizeString("Wales [or Cymru]"), "Wales accept Cymru")
eqOrThrow(attemptToNormalizeString("Uranus"), "Uranus")
eqOrThrow(
  attemptToNormalizeString("Jean Jacques Rousseau"),
  "Jean Jacques Rousseau"
)
eqOrThrow(attemptToNormalizeString("Seven Years' War"), "Seven Years' War")
eqOrThrow(
  attemptToNormalizeString("Heisenberg uncertainty principle"),
  "Heisenberg uncertainty principle"
)
eqOrThrow(attemptToNormalizeString("mantle"), "mantle")
eqOrThrow(
  attemptToNormalizeString("Plato [or Platon] &lt;JR&gt;"),
  "Plato accept Platon"
)
eqOrThrow(
  attemptToNormalizeString("Benjamin Harrison [prompt on Harrison]"),
  "Benjamin Harrison prompt Harrison"
)
eqOrThrow(
  attemptToNormalizeString("Benito Pablo Juarez"),
  "Benito Pablo Juarez"
)
eqOrThrow(
  attemptToNormalizeString('"To Althea, From Prison"'),
  "To Althea, From Prison"
)

eqOrThrow(
  attemptToNormalizeString("Blah (Blee) Blah (Blu blu)"),
  "Blah (Blee) Blah blu blu"
)

// eqOrThrow(
//   attemptToNormalizeString(
//     "confession [accept answers like penance or penitential acts; accept reconciliation; accept word forms like I confess; accept confiteor] &lt;MK&gt;"
//   )
// )
// eqOrThrow(
//   attemptToNormalizeString(
//     "John Galbraith &lt;Social Science, AK&gt;&lt;ed. AH&gt;"
//   )
// )
// eqOrThrow(
//   attemptToNormalizeString(
//     "Mikhail Gorbachev [or Mikhail Sergeyevich Gorbachev] &lt;JL, European History&gt;"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Jonathan Swift &lt;KT&gt;"))
// eqOrThrow(attemptToNormalizeString("Diego (RodrÃ­guez de Silva y) VelÃ¡zquez"))
// eqOrThrow(
//   attemptToNormalizeString(
//     "Garden of Eden (also accept Garden of God or Garden of Yahweh)"
//   )
// )
// eqOrThrow(
//   attemptToNormalizeString(
//     "Tokugawa Ieyasu [accept in either order; accept Tosho Daigongen; accept Matsudaira Takechiyo]"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Parasitism [accept word forms]"))
// eqOrThrow(attemptToNormalizeString("Werner Herzog &lt;IKD&gt;"))
// eqOrThrow(attemptToNormalizeString("English Civil War"))
// eqOrThrow(attemptToNormalizeString("nerve cell or neuron"))
// eqOrThrow(attemptToNormalizeString("distillation"))
// eqOrThrow(attemptToNormalizeString("Ming Dynasty"))
// eqOrThrow(attemptToNormalizeString("Honore de Balzac"))
// eqOrThrow(attemptToNormalizeString("Carl Jung"))
// eqOrThrow(
//   attemptToNormalizeString(
//     'iambs [or iambus; or iambic verse; do not accept "iambic pentameter" or "blank verse";'
//   )
// )
// eqOrThrow(attemptToNormalizeString("Aaron Copland"))
// eqOrThrow(attemptToNormalizeString("La Boheme"))
// eqOrThrow(attemptToNormalizeString("Boston, Massachusetts"))
// eqOrThrow(
//   attemptToNormalizeString(
//     " Calvin (prompt on Tracer Bullet, Stupendous Man, or Spaceman Spiff before mentioned)"
//   )
// )
// eqOrThrow(
//   attemptToNormalizeString('poliomyelitis (prompt on "infantile paralysis")')
// )
// eqOrThrow(
//   attemptToNormalizeString(
//     "Sandro Botticelli [or Alessandro di Mariano Filipepi]"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Things Fall Apart &lt;MS&gt;"))
// eqOrThrow(attemptToNormalizeString("Hera [or Juno]"))
// eqOrThrow(
//   attemptToNormalizeString(
//     "double displacement reactions [or double replacement reactions]"
//   )
// )
// eqOrThrow(
//   attemptToNormalizeString(
//     "Nicolaus Copernicus [or Mikolaj Kopernik; or Nikolaus Kopernikus; or Nicolas Copernico]"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Siddhartha &lt;RP&gt;"))
// eqOrThrow(attemptToNormalizeString("The Panama Papers &lt;AN&gt; BONUSES"))
// eqOrThrow(
//   attemptToNormalizeString(
//     "Confucius [or Kong Fuzi; or Kong Qui; or Kongzi] &lt;EA, Philosophy&gt;"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Arthur  Miller"))
// eqOrThrow(attemptToNormalizeString("John Greenleaf Whittier"))
// eqOrThrow(attemptToNormalizeString("M.C. Escher"))
// eqOrThrow(
//   attemptToNormalizeString(
//     "magnetic field (accept B-field or H-field, prompt on “B” or “H”)"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Chromatography"))
// eqOrThrow(
//   attemptToNormalizeString(
//     'limerick (do not accept "poem", as they existed well before the 13th century)'
//   )
// )
// eqOrThrow(attemptToNormalizeString("John Irving"))
// eqOrThrow(attemptToNormalizeString("Mali Empire"))
// eqOrThrow(
//   attemptToNormalizeString("complex conjugate &lt;Math — French&gt; [Edited]")
// )
// eqOrThrow(
//   attemptToNormalizeString(
//     "Apple Inc. (prompt on FoxConn if they buzz in the first sentence) &lt;DA&gt;"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Mollusca [or mollusks]"))
// eqOrThrow(attemptToNormalizeString("Faust"))
// eqOrThrow(
//   attemptToNormalizeString(
//     "Spanish Armada [or Grande y Felicicima Armada; accept Great and Most Fortunate Navy][JoC]"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Ali [or Ali ibn Abi Talib]"))
// eqOrThrow(attemptToNormalizeString("Emily Dickinson"))
// eqOrThrow(attemptToNormalizeString("Marlon Brando Jr."))
// eqOrThrow(attemptToNormalizeString("protons"))
// eqOrThrow(attemptToNormalizeString("Eero Saarinen"))
// eqOrThrow(
//   attemptToNormalizeString(
//     "zero [accept zeroth law of thermodynamics; accept absolute zero] &lt;AF/JR&gt;"
//   )
// )
// eqOrThrow(attemptToNormalizeString("Watergate Hotel"))
