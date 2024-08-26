export { };

declare global {
  interface GameData {
    timestamp: string;
    centerLetter: string;
    outerLetters: string[];
    validWords: string[];
  }

  interface Window {
    __GAME_DATA__: {
      today: GameData;
      yesterday: GameData;
    }
  }
}