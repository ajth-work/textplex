"use client";

import { useEffect, useState } from "react";

import { applyPreferredSpeechVoice, readStoredReaderSpeechVoiceGender } from "../lib/textplex";

type StudyPronunciationGuideProps = {
  languageCode?: string | null;
  pronunciationText: string | null;
  syllableText?: string | null;
  audioText: string | null;
  inventoryId?: string;
  className?: string;
};

const russianTransliterationSeparatorPattern = /[\s'’\-.0-9]/u;
const russianTransliterationVowelPattern = /[aeiouy]/i;
const russianTransliterationVowelDigraphs = ["ya", "ye", "yo", "yu"];
const russianTransliterationOnsetClusters = new Set([
  "bl",
  "br",
  "ch",
  "dr",
  "fl",
  "fr",
  "gl",
  "gr",
  "kh",
  "kl",
  "kr",
  "ks",
  "kv",
  "ml",
  "mn",
  "pl",
  "pr",
  "ps",
  "sh",
  "shch",
  "sk",
  "sl",
  "sm",
  "sn",
  "sp",
  "st",
  "sv",
  "tr",
  "tv",
  "ts",
  "vl",
  "vr",
  "zh",
]);

type RussianTransliterationUnit = {
  text: string;
  vowel: boolean;
};

function tokenizeRussianTransliteration(reading: string): RussianTransliterationUnit[] {
  const trimmed = reading.trim();
  if (!trimmed) {
    return [];
  }

  const lower = trimmed.toLowerCase();
  const units: RussianTransliterationUnit[] = [];
  for (let index = 0; index < lower.length; ) {
    const separator = trimmed[index];
    if (separator && russianTransliterationSeparatorPattern.test(separator)) {
      index += 1;
      continue;
    }

    const remaining = lower.slice(index);
    const vowelDigraph = russianTransliterationVowelDigraphs.find((candidate) => remaining.startsWith(candidate));
    if (vowelDigraph) {
      units.push({
        text: trimmed.slice(index, index + vowelDigraph.length),
        vowel: true,
      });
      index += vowelDigraph.length;
      continue;
    }

    const consonantDigraph = ["shch", "sch", "kh", "zh", "ch", "sh", "ts"].find((candidate) => remaining.startsWith(candidate));
    if (consonantDigraph) {
      units.push({
        text: trimmed.slice(index, index + consonantDigraph.length),
        vowel: false,
      });
      index += consonantDigraph.length;
      continue;
    }

    units.push({
      text: trimmed[index],
      vowel: russianTransliterationVowelPattern.test(lower[index] ?? ""),
    });
    index += 1;
  }

  return units;
}

function splitRussianTransliterationIntoParts(reading: string): string[] {
  const units = tokenizeRussianTransliteration(reading);
  if (!units.length) {
    return [];
  }

  const vowelIndices = units.flatMap((unit, index) => (unit.vowel ? [index] : []));
  if (vowelIndices.length <= 1) {
    return [units.map((unit) => unit.text).join("")];
  }

  const parts: string[] = [];
  let startIndex = 0;

  for (let vowelIndex = 0; vowelIndex < vowelIndices.length - 1; vowelIndex += 1) {
    const currentVowelIndex = vowelIndices[vowelIndex];
    const nextVowelIndex = vowelIndices[vowelIndex + 1];
    const clusterUnits = units.slice(currentVowelIndex + 1, nextVowelIndex);

    let nextStartIndex = currentVowelIndex + 1;
    if (clusterUnits.length > 1) {
      const clusterText = clusterUnits.map((unit) => unit.text).join("").toLowerCase();
      nextStartIndex = russianTransliterationOnsetClusters.has(clusterText) ? currentVowelIndex + 1 : currentVowelIndex + 2;
    }

    const chunk = units.slice(startIndex, nextStartIndex).map((unit) => unit.text).join("");
    if (chunk) {
      parts.push(chunk);
    }
    startIndex = nextStartIndex;
  }

  const finalChunk = units.slice(startIndex).map((unit) => unit.text).join("");
  if (finalChunk) {
    parts.push(finalChunk);
  }

  return parts.length ? parts : [units.map((unit) => unit.text).join("")];
}

function splitGuideParts(text: string, languageCode?: string | null): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (languageCode?.startsWith("ru") || /[\p{Script=Cyrillic}]/u.test(trimmed)) {
    return splitRussianTransliterationIntoParts(trimmed);
  }

  return trimmed.split(/\s+/u).filter((part) => part.length > 0);
}

export function StudyPronunciationGuide({
  languageCode,
  pronunciationText,
  syllableText,
  audioText,
  inventoryId = "study.practice-pronunciation-guide",
  className,
}: StudyPronunciationGuideProps) {
  const [activeText, setActiveText] = useState<string | null>(null);
  const displayText = pronunciationText?.trim() || syllableText?.trim() || "";
  const speechText = audioText?.trim() || displayText;
  const guideParts = splitGuideParts(syllableText ?? pronunciationText ?? "", languageCode);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!displayText) {
    return null;
  }

  function stopPlayback(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveText(null);
  }

  function playSpeech(text: string): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const nextText = text.trim();
    if (!nextText) {
      return;
    }

    if (activeText === nextText) {
      stopPlayback();
      return;
    }

    stopPlayback();
    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    applyPreferredSpeechVoice(utterance, languageCode, readStoredReaderSpeechVoiceGender());
    utterance.onstart = () => {
      setActiveText(nextText);
    };
    utterance.onend = () => {
      setActiveText((current) => (current === nextText ? null : current));
    };
    utterance.onerror = () => {
      setActiveText((current) => (current === nextText ? null : current));
    };
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className={["study-pronunciation-guide", className].filter(Boolean).join(" ")} data-inventory-id={inventoryId}>
      <span className="eyebrow">Pronunciation guide</span>
      <button
        type="button"
        className={`study-pronunciation-guide-button ${activeText === speechText ? "is-playing" : ""}`}
        onClick={() => playSpeech(speechText)}
        aria-label={`Play pronunciation for ${displayText}`}
        aria-pressed={activeText === speechText}
      >
        {displayText}
      </button>
      {guideParts.length > 1 ? (
        <div className="study-pronunciation-guide-parts" aria-label="Pronunciation syllables">
          {guideParts.map((part, index) => (
            <button
              key={`${displayText}-${index}-${part}`}
              type="button"
              className={`study-pronunciation-guide-part ${activeText === part ? "is-playing" : ""}`}
              onClick={() => playSpeech(part)}
              aria-label={`Play pronunciation for ${part}`}
              aria-pressed={activeText === part}
            >
              {part}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
