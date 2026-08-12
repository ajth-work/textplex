export type JapaneseRomajiInput = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export declare function composeJapaneseRomaji(value: string): string;
export declare function finalizeJapaneseRomaji(value: string): string;
export declare function composeJapaneseRomajiInput(
  value: string,
  selectionStart?: number,
  selectionEnd?: number,
): JapaneseRomajiInput;
