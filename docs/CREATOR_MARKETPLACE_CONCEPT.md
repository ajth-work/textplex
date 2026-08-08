# TextPlex Creator Marketplace Concept

## Summary

TextPlex could become a marketplace where creators publish materials for the language-learning community. The initial marketplace would support two complementary product types:

1. **Written content** — stories, essays, graded readers, serials, and other works that learners can read.
2. **Reader themes** — visual themes, typography packs, backgrounds, and related presentation styles that learners can buy or install.

The two storefronts should feel distinct to users, while sharing the same creator, product, purchase, ownership, review, and moderation infrastructure.

## 1. Written-content storefront

### Audience

Writers—especially writers creating Japanese-language material—could publish work for TextPlex’s Japanese-oriented learning community. The model could later expand to other languages supported by TextPlex.

### Example products

- Short stories and essays
- Graded readers
- Serialized fiction
- Original articles about culture or everyday life
- Reading collections or themed bundles
- Optional audio or study supplements

### Learner-facing value

Written works would be more useful than a generic ebook catalog because they could be described through learning-specific metadata:

- Target language
- Reading level and estimated difficulty
- Genre, topic, and length
- Vocabulary coverage
- Furigana or other reading aids
- Audio availability
- Preview pages
- Compatibility with TextPlex reading and progress features

The strongest long-term differentiator is making creator content **learning-aware**: TextPlex could help readers understand whether a work is appropriate for their level and track exposure while they read.

### Creator-facing value

Creators would gain access to readers who are intentionally seeking authentic language material, rather than having to distribute through a general publishing platform. TextPlex could provide creator pages, previews, sales information, and a direct relationship with an interested learner audience.

### Main risks

- Copyright ownership and licensing
- Unauthorized uploads or copied works
- Content moderation and reporting
- Age-appropriate and policy-sensitive content
- Translation, annotation, and AI-processing permissions
- Quality and difficulty claims that do not match the actual work

## 2. Theme storefront

### Audience

Artists and designers could publish themes for the TextPlex reading experience. A theme might change the mood and visual presentation of the app without changing its core learning functionality.

### Example products

- Full reader themes
- Wallpaper and background packs
- Typography and color schemes
- Seasonal or cultural themes
- Minimal, high-contrast, or accessibility-oriented themes
- Bundles containing coordinated visual assets

### Learner-facing value

Themes allow learners to personalize a reading environment they may use frequently. This creates an optional support path for users who want to buy something visual without placing core reading functionality behind a paywall.

### Creator-facing value

Artists get a focused distribution channel and a clear use case: their work becomes part of a learner’s daily reading environment. Creator profiles and theme previews can make the relationship between artist and community visible.

### Main risks

- Theme compatibility across app versions
- Asset sizing and performance
- Accessibility and readability
- Inappropriate or infringing artwork
- Safe handling of uploaded assets
- Clear licensing for personal use, redistribution, and commercial use

## Shared marketplace foundation

Both storefronts can use a common marketplace model:

- Creator profiles
- Product listings
- Product type and category metadata
- Free previews or samples
- Pricing and optional free products
- Purchases and user ownership
- Ratings and reviews
- Creator payouts
- Licensing terms
- Reporting and moderation
- Admin review and publishing status
- Product versioning and compatibility information

Conceptually, a marketplace product could be represented as:

```text
Creator
  └── Product
        ├── type: written_content | theme
        ├── metadata
        ├── preview assets
        ├── price and licensing
        ├── review status
        └── published versions
```

## Recommended sequencing

The theme storefront is the better first marketplace MVP. It has fewer copyright and moderation complexities, can be previewed visually, and establishes the shared marketplace infrastructure with a smaller operational surface.

### Phase 1: Theme marketplace

- Creator profile
- Theme upload and preview
- Theme metadata and compatibility requirements
- Free and paid themes
- User ownership and installation
- Basic review, reporting, and admin approval

### Phase 2: Written-content marketplace

- Writer profile and product page
- Reading preview
- Difficulty and language metadata
- Book or work ownership
- Content processing and reader integration
- Expanded rights, moderation, and reporting workflows

### Phase 3: Learning-aware creator ecosystem

- Vocabulary and exposure analytics
- Audio and annotation support
- Creator collections and bundles
- Subscriptions or serial releases
- Recommendations based on learner level and interests
- Creator dashboards and payout reporting

## Positioning

> TextPlex Marketplace helps language learners discover books, stories, and reading themes created by the community—and helps creators reach readers who are actively learning through their work.

The storefronts should be presented as an extension of the reading system, not as a distraction layer or a general-purpose app store. Written content should improve access to meaningful language input; themes should make sustained reading more personal and enjoyable.

## Questions to resolve before implementation

- Which languages and creator regions are supported first?
- Will purchases be one-time, subscription-based, tip-based, or a combination?
- What percentage of each sale does TextPlex retain?
- Which written-content rights must creators grant for processing, storage, and delivery?
- Are themes installed as data-driven configurations, or can they include executable code?
- What review standards apply before a product becomes publicly available?
- How will refunds, takedowns, copyright claims, and creator appeals work?
- Which marketplace features belong in the first public release versus a later creator program?

## Separate note: creator workflows should differ by product type

The creator experience should not be identical for written content and themes.

### Written-content creator workflow

Written-content creators should have a lightweight publishing flow. A creator could import a text file, enter basic metadata, and let TextPlex extract and prepare the content for review. The workflow might include:

- Simple text import
- Automatic extraction of paragraphs, chapters, or sections
- Language and title metadata
- Optional cover image and author information
- Preview of the imported reading experience
- Processing status before submission for review

The goal is to make publishing written work feel close to importing a document into TextPlex for reading, with only the additional steps needed for marketplace metadata, rights confirmation, and review.

### Theme-creator workflow

Theme creators need a dedicated authoring tool because a theme must be tested and tuned across many parts of the reader interface before it is published. The creator should be able to upload a wallpaper or other visual assets, edit the generated settings, and preview the result in representative TextPlex screens.

The theme tool could provide controls for named design tokens such as:

- App background
- Reader background
- Primary and secondary text
- Muted text
- Accent color
- Links and interactive controls
- Buttons and selected states
- Cards, panels, and borders
- Highlights and vocabulary markings
- Progress indicators
- Error, warning, and success states
- Overlay and modal surfaces

### Wallpaper-assisted generation

When a creator uploads a wallpaper, TextPlex could analyze the image and recommend an initial theme configuration. The recommendation could consider dominant colors, light and dark regions, contrast, saturation, and likely text readability.

The recommendation should be a starting point rather than a fixed result. Creators should be able to:

- Accept the recommended color scheme
- Generate alternate schemes from the same wallpaper
- Switch between light, dark, muted, and high-contrast directions
- Fine-tune each design token manually
- Lock important colors while regenerating the rest
- See contrast or readability warnings
- Preview the theme at mobile and desktop sizes
- Compare the recommended scheme with custom variants

### Publishing requirements

Before a theme can go on sale, the creator should see a final preview of the theme in the major TextPlex surfaces and confirm that the theme meets basic compatibility and readability requirements. The resulting product should store the approved theme configuration together with its assets and supported app-version information, rather than relying only on a static screenshot or a single wallpaper.

## Separate note: translators as marketplace contributors

The written-content storefront could create a second creator role for translators. A writer may want to publish a work with a translation, but the quality and provenance of that translation could vary. TextPlex could make Google Translate the default, low-friction option while also supporting paid human translation and review.

### Translation paths

For each written work, the creator could choose among several paths:

- **Machine translation** using Google Translate as the default convenience option
- **Human review** of a machine-generated translation
- **Human translation** created from the original text
- **Hybrid translation** where machine output is used as a draft and a translator edits or replaces selected sections

Human-reviewed and human-created translations could become premium product variants. A writer who invests in professional translation would have a stronger product to sell, while readers could see clearly whether a translation is machine-generated, human-reviewed, or human-created.

### Translator workspace

Translators should be able to work inside TextPlex rather than exchanging separate documents. A translation workspace could provide:

- Original and translated text shown side by side
- Sentence-level alignment between the source and translation
- Editing controls for individual sentences or segments
- Ability to accept, rewrite, or reject machine suggestions
- Notes, comments, and questions for the writer
- Terminology or proper-name consistency tools
- Preview of the final bilingual reading experience
- Progress tracking for translated and reviewed segments

Sentence alignment is important because it gives TextPlex a measurable unit of work. The system could record how many sentences were translated, reviewed, or substantially edited, including the language pair and the status of each segment.

### Compensation and collaboration

The marketplace could support several collaboration arrangements:

- A writer commissions a translator before publishing
- A translator offers a translation service for an existing work
- A writer publishes a work and invites translators to submit proposals
- A reader-supported work funds translation milestones
- Multiple translators collaborate on different chapters or language pairs

Compensation could be based on agreed rates per translated or reviewed sentence, with adjustments for complexity, language pair, or revision depth. TextPlex should show the scope and approval status clearly so payments are tied to completed work rather than vague progress claims.

This model gives both sides a role in the ecosystem: writers can create and own the original work, while translators can create additional value by making that work accessible to another language community. For example, a Japanese writer could commission Japanese-to-English translation, while an English-speaking translator could participate directly in bringing that work to learners.

### Trust and product labeling

Each translation should retain provenance and status information, including:

- Source language and target language
- Machine translation provider, if used
- Translator or reviewer attribution
- Number of translated and reviewed segments
- Translation status and revision history
- Whether the translator approved the final version

Clear labeling would let readers choose the experience they want: a free machine-assisted translation, a human-reviewed edition, or a fully human-created translation.

## Separate note: language-program authors and pathway creators

TextPlex could also host complete language programs created by teachers, curriculum designers, and experienced learners. This would extend the marketplace beyond individual works and themes into structured learning pathways.

### Language pathways

A pathway could be organized around a language direction and a learner goal, such as:

- Japanese for English speakers
- English for Japanese speakers
- Korean for English speakers
- Reading-focused Japanese at an intermediate level
- A pathway for preparing to read a specific genre

The language direction matters because the learner’s native language, explanations, examples, grammar notes, and translation support may all depend on it. A Japanese-to-English pathway and an English-to-Japanese pathway should not be treated as the same product with reversed labels.

### Program-author role

A program author could be a teacher, tutor, translator, curriculum designer, or subject-matter expert who wants to package their approach into a repeatable learning experience. They could create a program, publish it through TextPlex, and earn money when learners purchase or subscribe to it.

A program might include:

- Learning goals and intended learner level
- A sequence of stages, units, or milestones
- Reading selections from the marketplace
- Vocabulary and grammar targets
- Explanations in the learner’s support language
- Translation or comparison exercises
- Review prompts and comprehension checks
- Recommended study cadence
- Progress and completion criteria
- Optional live sessions, feedback, or community discussion

### Program-creation workflow

Program authors would need a structured authoring tool rather than a simple file upload. The tool could allow them to:

- Define the source and target languages
- Choose a learner profile and starting level
- Build a sequence of lessons or reading milestones
- Attach existing TextPlex works, themes, translations, and vocabulary sets
- Add original explanations, prompts, and assessments
- Preview the learner experience
- Track which content is included in the program
- Publish free samples or a paid version
- Update the curriculum while preserving learner progress

Where possible, programs should compose existing TextPlex assets instead of duplicating them. A program author could reference a written work, a human-reviewed translation, or a vocabulary list while maintaining their own instructional structure around it.

### Hosted program products

Programs could be offered in several formats:

- One-time purchase for a complete pathway
- Subscription for an evolving curriculum
- Free introductory program with paid advanced stages
- Cohort-based program with scheduled participation
- Premium program with teacher feedback or live support
- Institution or classroom license

This creates a place for teachers to contribute directly without requiring TextPlex to author every language database and curriculum itself. TextPlex would provide the hosting, reading infrastructure, processing tools, learner progress model, and marketplace distribution, while the program author supplies the teaching method and curated path.

### Program quality and ownership

Each program should clearly identify:

- Author and qualifications or experience
- Source and target languages
- Intended learner level
- Required and included materials
- Whether content is original, licensed, or linked from another creator
- Update history
- Support and refund terms

Program authors should retain ownership of their original curriculum, while granting TextPlex the rights needed to host, process, display, and sell the program. If a program includes another creator’s work, the marketplace should preserve that creator’s attribution and licensing terms.
