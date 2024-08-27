/// <reference lib="webworker" />

// @ts-nocheck - TypeScript is garbage and has no idea what to do with
// service workers, so we're disabling type checking for this file

const cacheName = "open-spelling-bee-1.4.9";
const wordDataCacheName = "open-spelling-bee-words/en-1.0.0";

const wordDataPathname = "/words/en";

self.addEventListener("install", (e) => {
  // The promise that skipWaiting() returns can be safely ignored.
  self.skipWaiting();

  e.waitUntil(
    caches.open(cacheName).then((cache) =>
      cache.addAll([
        // "/",
        // "/index.html",
        // 3rd party libraries
        "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js/+esm",
        "https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js/+esm",
      ])
    )
  );
});

/**
 * @param {Date} date
 */
const getDateTimestamp = (date) =>
  Number(
    `${date.getFullYear()}${date.getMonth().toString().padStart(2, "0")}${date
      .getDate()
      .toString()
      .padStart(2, "0")}`
  );

self.addEventListener("activate", (e) => {
  // Claim all clients immediately, so the service worker can control
  // initial requests
  self.clients.claim();

  // Clean up cached requests from previous versions
  e.waitUntil(
    Promise.all([
      caches.keys().then((keyList) =>
        Promise.all(
          keyList.map((key) => {
            if (key !== cacheName) {
              caches.delete(key);
            }
          })
        )
      ),
      caches.open(cacheName).then((cache) =>
        cache.keys().then((requests) => {
          // Delete all cached word data requests from days other than today and yesterday
          const date = new Date();
          const todayTimestampString = getDateTimestamp(date);

          date.setDate(date.getDate() - 1);
          const yesterdayTimestampString = getDateTimestamp(date);

          return Promise.all(
            requests.map((request) => {
              const requestURL = new URL(request.url);
              if (requestURL.pathname === wordDataPathname) {
                const requestTimestamp = requestURL.searchParams.get("t");
                if (
                  requestTimestamp === todayTimestampString ||
                  requestTimestamp === yesterdayTimestampString
                ) {
                  return;
                }

                return cache.delete(request);
              }
            })
          );
        })
      ),
    ])
  );
});

self.addEventListener("fetch", (e) => {
  const requestURL = new URL(e.request.url);

  // Skip requests that aren't http(s)
  if (requestURL.protocol !== "http:" && requestURL.protocol !== "https:") {
    return;
  }

  if (requestURL.hostname === self.location.hostname) {
    if (requestURL.pathname === "/" || requestURL.pathname === "/index.html") {
      return e.respondWith(handlePageRequest(requestURL));
    }

    if (requestURL.hostname === "localhost") {
      // Skip caching of localhost requests
      return e.respondWith(fetch(e.request));
    }
  }

  // Auto-cache all other requests
  e.respondWith(
    caches.open(cacheName).then((cache) =>
      cache.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then((response) => {
          cache.put(e.request, response.clone());
          return response;
        });
      })
    )
  );
});

/**
 * @param {number} seed
 * @returns {number}
 */
const seededRandom = (seed) => {
  var t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

async function getWordData() {
  const cache = await caches.open(wordDataCacheName);

  const cachedUncompressedWordDataResponse = await cache.match(
    "/words/en.json"
  );

  if (cachedUncompressedWordDataResponse) {
    return cachedUncompressedWordDataResponse;
  }

  /** @type {string} */
  let fullWordDataJSONString = "";

  // @ts-ignore
  const stream = (await fetch("/words/en.json.gz")).body
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream());

  const reader = stream.getReader();
  try {
    /** @type {Awaited<ReturnType<typeof reader.read>>} */
    let readResult;
    while (!(readResult = await reader.read()).done) {
      fullWordDataJSONString += readResult.value;
    }
  } finally {
    reader.releaseLock();
  }

  const wordDataJSONResponse = new Response(fullWordDataJSONString);
  await cache.put("/words/en.json", wordDataJSONResponse.clone());

  return wordDataJSONResponse;
}

/**
 * @param  {[string[], string[], number[][]]} wordData
 * @param {number} dateTimestamp
 */
function getWordDataForDate(
  [allWords, letterSets, letterSetWordIndices],
  dateTimestamp
) {
  const letterSetIndex = Math.floor(
    seededRandom(dateTimestamp) * letterSets.length
  );

  /** @type {string} */
  const letterSetString = letterSets[letterSetIndex];

  /** @type {string | null} */
  let centerLetter = null;

  /**
   * @type {string[]}
   */
  const outerLetters = new Array(6);
  let outerLetterIndex = 0;

  for (let i = 0; i < 7; ++i) {
    const letter = letterSetString[i];
    const charCode = letter.charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) {
      // If the letter is uppercase, it's the center letter
      centerLetter = letter.toLowerCase();
    } else {
      outerLetters[outerLetterIndex++] = letter;
    }
  }

  if (centerLetter === null) {
    throw new Error("No center letter found");
  }

  const validWordIndices = letterSetWordIndices[letterSetIndex];

  /**
   * @type {string[]}
   */
  const validWords = new Array(validWordIndices.length);
  for (let i = 0; i < validWordIndices.length; ++i) {
    validWords[i] = allWords[validWordIndices[i]];
  }

  return {
    timestamp: dateTimestamp,
    centerLetter,
    outerLetters,
    validWords,
  };
}

/**
 * @param {URL} requestURL
 * @returns
 */
async function handlePageRequest(requestURL) {
  // Set the timestamp to midnight of the current day, in UTC
  // to make sure everyone gets the same words for the day regardless of timezone
  const todayDate = new Date();
  const todayTimestamp = getDateTimestamp(todayDate);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(todayDate.getDate() - 1);
  const yesterdayTimestamp = getDateTimestamp(yesterdayDate);

  const cache = await caches.open(cacheName);

  const todayPageResponseURL = new URL(requestURL);
  todayPageResponseURL.searchParams.set("t", String(todayTimestamp));

  const cachedTodayPageResponse = await cache.match(todayPageResponseURL);
  if (requestURL.hostname !== "localhost" && cachedTodayPageResponse) {
    return cachedTodayPageResponse;
  }

  let basePageHTMLResponse = await cache.match(requestURL);
  if (!basePageHTMLResponse || requestURL.hostname === "localhost") {
    basePageHTMLResponse = await fetch(requestURL);
    cache.put(requestURL, basePageHTMLResponse.clone());
  }

  let [[todayWordData, yesterdayWordData], pageHTML] = await Promise.all([
    getWordData()
      .then((res) => res.json())
      .then((wordData) =>
        Promise.all([
          getWordDataForDate(wordData, todayTimestamp),
          getWordDataForDate(wordData, yesterdayTimestamp),
        ])
      ),
    cache
      .match(requestURL)
      .then(
        (cachedRes) =>
          cachedRes ??
          fetch(requestURL).then((res) => {
            cache.put(requestURL, res.clone());
            return res;
          })
      )
      .then((res) => res.text()),
  ]);

  const headIndex = pageHTML.indexOf("</head>");
  const letterButtonsIndex = pageHTML.indexOf("</letter-buttons");
  const previousGuessListIndex = pageHTML.indexOf("</previous-guess-list");

  // Inject a script to expose the game data for today and yesterday to the client,
  // and pre-render guess list and letter buttons
  pageHTML = `${pageHTML.slice(0, headIndex)}<script>
    window.__GAME_DATA__ = {
      today: ${JSON.stringify(todayWordData)},
      yesterday: ${JSON.stringify(yesterdayWordData)},
    };
  </script>${pageHTML.slice(
    headIndex,
    letterButtonsIndex
  )}${todayWordData.outerLetters
    .concat(todayWordData.centerLetter)
    .reduce(
      (buttonsHTML, letter) =>
        buttonsHTML +
        `<button type="button" class="${
          letter === todayWordData.centerLetter ? "center" : "outer"
        }">${letter}</button>`,
      ""
    )}${pageHTML.slice(letterButtonsIndex)}`;

  const todayPageResponse = new Response(pageHTML, {
    headers: basePageHTMLResponse.headers,
  });
  cache.put(todayPageResponseURL, todayPageResponse.clone());
  return todayPageResponse;
}
