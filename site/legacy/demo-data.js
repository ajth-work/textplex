export const DEMO_BOOKS = [
  {
    id: "demo-three-body",
    title: "Three-Body Mini Slice",
    author: "刘慈欣",
    language_code: "zh",
    source_filename: "three-body-mini-slice.pdf",
    source_path: "/demo/three-body-mini-slice.pdf",
    source_sha256: "demo-three-body",
    total_pages: 4,
    status: "ready",
    page_split_status: "pages_split",
    page_image_count: 4,
    pages_path: "/demo/pages",
    extraction_status: "ready",
    extracted_page_count: 4,
    extraction_path: "/demo/extractions",
    created_at: "2026-07-08T23:08:00.000Z",
    processed_at: "2026-07-08T23:12:00.000Z",
  },
];

export const DEMO_PAGE = {
  book: DEMO_BOOKS[0],
  page: {
    page_number: 1,
    image_filename: "0001.png",
    image_path: "/demo/pages/0001.png",
    status: "ready",
    created_at: "2026-07-08T23:08:00.000Z",
  },
  image_url: makeDemoPageImage(),
  extraction: {
    source_page_sha256: "demo-page-1",
    text_source: "ocr",
    text_source_signature: "demo",
    processor_version: "demo",
    pipeline_version: "demo",
    page: {
      book_id: "demo-three-body",
      page_number: 1,
      language_code: "zh",
      source_page_sha256: "demo-page-1",
      processor_version: "demo",
      pipeline_version: "demo",
      raw_text:
        "我一直觉得宇宙像一张巨大而安静的网。它看不见，却一直在拉扯着所有人。可是只有在黑暗里，人才能看清星光。",
      clean_text:
        "我一直觉得宇宙像一张巨大而安静的网。它看不见，却一直在拉扯着所有人。可是只有在黑暗里，人才能看清星光。",
      sentences: [
        {
          order: 1,
          text: "我一直觉得宇宙像一张巨大而安静的网。",
          translation: "I always feel the universe is like a huge, quiet net.",
          tokens: [
            token(1, "我", "I", "wǒ", "personal pronoun"),
            token(2, "一直", "all the time", "yīzhí", "always"),
            token(3, "觉得", "feel", "juéde", "to feel"),
            token(4, "宇宙", "universe", "yǔzhòu", "universe"),
            token(5, "像", "like", "xiàng", "to resemble"),
            token(6, "一张", "a sheet of", "yī zhāng", "one sheet"),
            token(7, "巨大", "huge", "jùdà", "large"),
            token(8, "而", "and", "ér", "and"),
            token(9, "安静", "quiet", "ānjìng", "quiet"),
            token(10, "的", "particle", "de", "modifier particle"),
            token(11, "网", "net", "wǎng", "net"),
            token(12, "。", "stop", null, "full stop"),
          ],
          grammar_patterns: ["像...一样"],
        },
        {
          order: 2,
          text: "它看不见，却一直在拉扯着所有人。",
          translation: "It cannot be seen, yet it is always pulling at everyone.",
          tokens: [
            token(1, "它", "it", "tā", "third-person pronoun"),
            token(2, "看不见", "cannot be seen", "kàn bú jiàn", "invisible"),
            token(3, "，", "pause", null, "comma"),
            token(4, "却", "yet", "què", "but"),
            token(5, "一直", "all the time", "yīzhí", "always"),
            token(6, "在", "at", "zài", "progressive marker"),
            token(7, "拉扯", "pull", "lāchě", "to pull"),
            token(8, "着", "marker", "zhe", "aspect marker"),
            token(9, "所有人", "everyone", "suǒyǒurén", "everybody"),
            token(10, "。", "stop", null, "full stop"),
          ],
          grammar_patterns: ["却..."],
        },
        {
          order: 3,
          text: "可是只有在黑暗里，人才能看清星光。",
          translation: "Only in darkness can people truly see the starlight.",
          tokens: [
            token(1, "可是", "however", "kěshì", "however"),
            token(2, "只有", "only", "zhǐyǒu", "only"),
            token(3, "在", "in", "zài", "progressive marker"),
            token(4, "黑暗", "darkness", "hēi'àn", "darkness"),
            token(5, "里", "inside", "lǐ", "locative"),
            token(6, "，", "pause", null, "comma"),
            token(7, "人", "people", "rén", "person"),
            token(8, "才", "only then", "cái", "only then"),
            token(9, "能", "can", "néng", "can"),
            token(10, "看清", "see clearly", "kànqīng", "see clearly"),
            token(11, "星光", "starlight", "xīngguāng", "starlight"),
            token(12, "。", "stop", null, "full stop"),
          ],
          grammar_patterns: ["只有...才..."],
        },
      ],
      token_occurrences: [],
      lexical_entries: [
        { lemma: "宇宙", display_form: "宇宙", frequency_in_book: 4, first_page: 1, last_page: 4 },
        { lemma: "看不见", display_form: "看不见", frequency_in_book: 2, first_page: 1, last_page: 2 },
        { lemma: "星光", display_form: "星光", frequency_in_book: 1, first_page: 1, last_page: 1 },
      ],
    },
  },
};

export const DEMO_LEXICON = {
  "宇宙": [
    {
      id: 1,
      language_code: "zh",
      entry_type: "vocab",
      surface_form: "宇宙",
      pinyin: "yǔzhòu",
      tone: null,
      definition: "universe; cosmos",
      radical: "宀",
      stroke_count: 6,
      hsk_level: "4",
      frequency_rank: 1880,
      note: "demo entry",
      source_name: "demo",
      source_path: "demo",
    },
  ],
  "看不见": [
    {
      id: 2,
      language_code: "zh",
      entry_type: "vocab",
      surface_form: "看不见",
      pinyin: "kàn bú jiàn",
      tone: null,
      definition: "cannot see; invisible",
      radical: "见",
      stroke_count: 10,
      hsk_level: "3",
      frequency_rank: 940,
      note: "demo entry",
      source_name: "demo",
      source_path: "demo",
    },
  ],
  "星光": [
    {
      id: 3,
      language_code: "zh",
      entry_type: "vocab",
      surface_form: "星光",
      pinyin: "xīngguāng",
      tone: null,
      definition: "starlight",
      radical: "日",
      stroke_count: 9,
      hsk_level: "4",
      frequency_rank: 2270,
      note: "demo entry",
      source_name: "demo",
      source_path: "demo",
    },
  ],
};

function token(order, surface_form, definition_short, romanization, part_of_speech) {
  return {
    order,
    surface_form,
    lemma: surface_form,
    part_of_speech,
    pronunciation: null,
    romanization,
    definition_short,
    proficiency_system: "demo",
    proficiency_level: "demo",
    entity: null,
    bbox: null,
  };
}

function makeDemoPageImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7f2ea"/>
          <stop offset="100%" stop-color="#ebe1d3"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" rx="42" fill="url(#g)"/>
      <rect x="68" y="70" width="764" height="1060" rx="26" fill="none" stroke="#2a2f36" stroke-width="4" stroke-dasharray="12 14"/>
      <text x="112" y="170" font-size="46" font-family="Georgia, serif" fill="#20242d">三体</text>
      <text x="112" y="250" font-size="28" font-family="Arial, sans-serif" fill="#40454f">Page preview</text>
      <text x="112" y="360" font-size="34" font-family="Georgia, serif" fill="#20242d">我一直觉得宇宙像一张巨大而安静的网。</text>
      <text x="112" y="450" font-size="34" font-family="Georgia, serif" fill="#20242d">它看不见，却一直在拉扯着所有人。</text>
      <text x="112" y="540" font-size="34" font-family="Georgia, serif" fill="#20242d">可是只有在黑暗里，人才能看清星光。</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
