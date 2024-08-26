/**
 * This file is responsible for managing the game state and logic.
 * It loads the game data and listens for/dispatches events as the user
 * submits guesses.
 */

const validWordSet = new Set(window.__GAME_DATA__.today.validWords);
const outerLetterSet = new Set(window.__GAME_DATA__.today.outerLetters);

// Unique id for where we store the game data for today's game in localStorage
const todayLocalStorageKey = `${window.__GAME_DATA__.today.timestamp}-v2`;
const yesterdayLocalStorageKey = `${window.__GAME_DATA__.yesterday.timestamp}-v2`;

for (let i = localStorage.length - 1; i >= 0; --i) {
  const key = localStorage.key(i);
  if (key && key !== todayLocalStorageKey && key !== yesterdayLocalStorageKey) {
    localStorage.removeItem(key);
  }
}

/**
 * @type {Set<string>}
 */
const correctGuessWordsSet = new Set(
  // Initialize with any saved guesses from today
  JSON.parse(localStorage.getItem(todayLocalStorageKey) ?? "[]")
);

/**
 * @type {Set<string>}
 */
const panagramWordsSet = new Set();

for (const word of validWordSet) {
  const wordLength = word.length;
  if (wordLength < 7) {
    continue;
  }

  let uniqueCharCount = 0;

  /**
   * @type {Record<string, boolean>}
   */
  const uniqueChars = {};

  for (let i = 0; i < wordLength; ++i) {
    const char = word[i];
    if (!uniqueChars[char]) {
      uniqueChars[char] = true;
      ++uniqueCharCount;
    }
  }

  if (uniqueCharCount === 7) {
    panagramWordsSet.add(word);
  }
}

/**
 * @param {string} word
 * @returns {{
 *  score: number,
 *  isPanagram: boolean
 * }}
 */
const getWordScore = (word) => {
  const wordLength = word.length;
  // 4-letter words are worth 1 point, but all longer words are worth their length (ie, 5-letter words are worth 5 points)
  const wordLengthScore = wordLength > 4 ? wordLength : 1;
  const isPanagram = wordLength > 7 && panagramWordsSet.has(word);

  return {
    score:
      wordLengthScore +
      // Panagrams are worth an additional 7 points
      Number(isPanagram) * 7,
    isPanagram,
  };
};

/**
 * @param {Event} guessEvent
 * @returns {string}
 */
const getGuessFromEvent = (guessEvent) => {
  if (
    guessEvent instanceof CustomEvent &&
    typeof guessEvent.detail.word === "string"
  ) {
    return guessEvent.detail.word.trim();
  }

  throw new Error("Invalid guess event");
};

/**
 * @typedef NotificationData
 *
 * @property {string} message
 * @property {"error" | "success"} status
 */

document.addEventListener("osb:guess", (evt) => {
  const guess = getGuessFromEvent(evt);

  /**
   * @type {NotificationData}
   */
  let notificationData;

  if (!validWordSet.has(guess)) {
    let message = "Not a valid word.";

    if (guess.length < 4) {
      message = "Word must be at least 4 letters long.";
    } else if (!guess.includes(window.__GAME_DATA__.today.centerLetter)) {
      message = "Word must include the center letter.";
    } else if (guess.split("").some((letter) => outerLetterSet.has(letter))) {
      message = "Word must only include the provided letters";
    }

    notificationData = {
      message,
      status: "error",
    };
  } else if (correctGuessWordsSet.has(guess)) {
    notificationData = {
      message: `You've already guessed that word.`,
      status: "error",
    };
  } else {
    // Correct guess!
    correctGuessWordsSet.add(guess);

    // Write the updated correct guesses to localStorage
    localStorage.setItem(
      todayLocalStorageKey,
      JSON.stringify(Array.from(correctGuessWordsSet))
    );

    const { score, isPanagram } = getWordScore(guess);

    let message = `+${score}`;
    if (isPanagram) {
      message = `Panagram! ${message}`;
      fireConfetti("panagram-confetti");
    }

    notificationData = {
      message,
      status: "success",
    };
  }

  document.dispatchEvent(
    new CustomEvent("osb:notify", {
      detail: notificationData,
    })
  );
});

const confettiPromise = import(
  // @ts-ignore
  "https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js/+esm"
);

/**
 * @type {Map<HTMLCanvasElement, (options: {
 *  angle: number;
 *  spread: number;
 *  particleCount: number;
 *  origin: { y: number };
 * })=>void>}
 */
const canvasConfettiCallbacks = new Map();

/**
 * @param {number} min
 * @param {number} max
 */
const randomInRange = (min, max) => Math.random() * (max - min) + min;

/**
 * @param {string} canvasID
 */
async function fireConfetti(canvasID) {
  try {
    const confettiModule = await confettiPromise;

    const confetti = confettiModule.default.confetti;
    const canvas = document.getElementById(canvasID);

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Could not find canvas element");
    }

    const confettiCallback =
      (await canvasConfettiCallbacks.get(canvas)) ||
      confetti.create(canvas).then(
        /**
         * @param {(options: {
         *  angle: number;
         *  spread: number;
         *  particleCount: number;
         *  origin: { y: number };
         * })=>void} cb
         */
        (cb) => {
          canvasConfettiCallbacks.set(canvas, cb);
          return cb;
        }
      );

    confettiCallback({
      angle: randomInRange(75, 105),
      spread: randomInRange(50, 70),
      particleCount: randomInRange(30, 45),
      origin: { y: 0.8 },
    });
  } catch (e) {
    console.error("Failed to fire confetti and ruined the party :(", e);
  }
}
