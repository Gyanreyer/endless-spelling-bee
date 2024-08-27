const guessDBOpenReq = indexedDB.open("guesses", 1);

/**
 * @type {Promise<IDBDatabase>}
 */
let guessDBPromise = new Promise((resolve, reject) => {
  guessDBOpenReq.onsuccess = (evt) => {
    resolve(evt.target.result);
  };
  guessDBOpenReq.onupgradeneeded = (evt) => {
    /**
     * @type {IDBDatabase}
     */
    const db = evt.target.result;
    const objectStore = db.createObjectStore("guesses", {
      keyPath: "timestamp",
    });
    objectStore.onsuccess = () => {
      resolve(db);
    };
    objectStore.onerror = (evt) => {
      reject(evt.target.error);
    };
  };
  guessDBOpenReq.onerror = (evt) => {
    reject(evt.target.error);
  };
});

window.getGuessesFromDB = (
  dateTimestamp = window.__GAME_DATA__.today.timestamp
) =>
  guessDBPromise.then(
    (guessDB) =>
      new Promise((resolve, reject) => {
        const dataRequest = guessDB
          .transaction("guesses", "readonly")
          .objectStore("guesses")
          .get(dateTimestamp);
        dataRequest.onsuccess = (evt) => {
          resolve(evt.target.result?.words ?? []);
        };
        dataRequest.onerror = (evt) => {
          reject(evt.target.error);
        };
      })
  );

window.saveGuessToDB = (
  guessedWord,
  dateTimestamp = window.__GAME_DATA__.today.timestamp
) =>
  guessDBPromise.then(
    (guessDB) =>
      new Promise((resolve, reject) => {
        const objectStore = guessDB
          .transaction("guesses", "readwrite")
          .objectStore("guesses");

        const dataRequest = objectStore.get(dateTimestamp);

        dataRequest.onsuccess = (evt) => {
          const currentData = evt.target.result ?? {
            timestamp: dateTimestamp,
            words: [],
          };

          currentData.words.push(guessedWord);

          const updateRequest = objectStore.put(currentData);
          updateRequest.onsuccess = () => {
            resolve();
          };
          updateRequest.onerror = (evt) => {
            reject(evt.target.error);
          };
        };
        dataRequest.onerror = (evt) => {
          reject(evt.target.error);
        };
      })
  );
