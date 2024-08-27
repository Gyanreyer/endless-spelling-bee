export { };

declare global {
  interface GameData {
    timestamp: number;
    centerLetter: string;
    outerLetters: string[];
    validWords: string[];
  }

  interface Window {
    __GAME_DATA__: {
      today: GameData;
      yesterday: GameData;
    };
    getGuessesFromDB: (dateTimestamp: number) => Promise<string[]>;
    saveGuessToDB: (guessedWord: string, dateTimestamp?: number) => Promise<void>;
  }
}