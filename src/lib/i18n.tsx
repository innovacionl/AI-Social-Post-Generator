import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'nl';

export interface Translations {
  // Sidebar
  sidebar: {
    topicChoice: string;
    research: string;
    postGenerator: string;
    drafts: string;
    pastPosts: string;
    settings: string;
  };
  // TopicChoice
  topicChoice: {
    title: string;
    subtitle: string;
    careerLabel: string;
    careerPlaceholder: string;
    industryLabel: string;
    industryPlaceholder: string;
    topicLabel: string;
    topicOptional: string;
    topicPlaceholder: string;
    errorFillBoth: string;
    errorGeneric: string;
    errorFailed: string;
    generateButton: string;
    generating: string;
    generatedTitle: string;
    generatedSubtitle: string;
    addToResearch: string;
    adding: string;
    added: string;
  };
  // Research
  research: {
    title: string;
    subtitle: string;
    errorDismiss: string;
    emptyTitle: string;
    emptyLinkLabel: string;
    emptyAfterLink: string;
    statusPending: string;
    statusInProgress: string;
    statusComplete: string;
    deleteTitle: string;
    conductResearch: string;
    researching: string;
    researchComplete: string;
    addToPostGenerator: string;
    detailFindingsTitle: string;
    detailResearchingTitle: string;
    detailResearchingSubtitle: string;
    detailResearchingTime: string;
    detailLatestUpdate: string;
    detailNoFindings: string;
    detailSourcesTitle: string;
    detailNoSources: string;
    detailConductButton: string;
    detailDraftButton: string;
    detailCloseButton: string;
    checkNow: string;
    checking: string;
    resetResearch: string;
    resetting: string;
    runningFor: string;
    lastChecked: string;
    geminiStatusLabel: string;
    rawStatusButton: string;
  };
  // PostGenerator
  postGenerator: {
    title: string;
    subtitle: string;
    researchSourceTitle: string;
    noResearchSelected: string;
    sourcesLabel: string;
    source: string;
    sources: string;
    showFullResearch: string;
    showLess: string;
    targetPlatformTitle: string;
    presetToneTitle: string;
    customStyleTitle: string;
    customStyleSubtitle: string;
    customStylePlaceholder: string;
    generateButton: string;
    generatingButton: string;
    openLastGenerations: string;
    previous: string;
    next: string;
    copy: string;
    copied: string;
    saveToDrafts: string;
    saving: string;
    savedToDrafts: string;
    toneOptions: string[];
    variationLabels: string[];
    ofLabel: string;
  };
  // Drafts
  drafts: {
    title: string;
    subtitle: string;
    draftSingular: string;
    draftPlural: string;
    searchPlaceholder: string;
    filtersButton: string;
    platformLabel: string;
    platformAll: string;
    toneLabel: string;
    allTones: string;
    sortBy: string;
    sortDate: string;
    sortPlatform: string;
    sortTone: string;
    emptyNoSaved: string;
    emptyNoMatch: string;
    emptyNoSavedSub: string;
    emptyNoMatchSub: string;
    edit: string;
    copy: string;
    copied: string;
    saveChanges: string;
    cancel: string;
    markAsPosted: string;
    delete: string;
  };
  // PastPosts
  pastPosts: {
    title: string;
    subtitleCount: string;
    searchPlaceholder: string;
    emptyNoPostsTitle: string;
    emptyNoPostsSub: string;
    emptyNoMatchTitle: string;
    emptyNoMatchSub: string;
    postedOn: string;
    showMore: string;
    showLess: string;
  };
  // Common
  common: {
    xTwitter: string;
    linkedin: string;
  };
}

const en: Translations = {
  sidebar: {
    topicChoice: 'Topic Choice',
    research: 'Research',
    postGenerator: 'Post Generator',
    drafts: 'Drafts',
    pastPosts: 'Past Posts',
    settings: 'Settings',
  },
  topicChoice: {
    title: 'Topic Choice',
    subtitle: 'Describe your background and let AI generate research questions for compelling content.',
    careerLabel: 'Career / Role',
    careerPlaceholder: 'e.g., Senior Product Manager at a SaaS company',
    industryLabel: 'Industry',
    industryPlaceholder: 'e.g., Enterprise B2B Software / FinTech',
    topicLabel: 'Specific Topic',
    topicOptional: '(optional)',
    topicPlaceholder: 'e.g., AI-driven personalization in onboarding flows',
    errorFillBoth: 'Please fill in both your career and industry.',
    errorGeneric: 'Something went wrong. Please try again.',
    errorFailed: 'Failed to add to research.',
    generateButton: 'Generate Questions',
    generating: 'Generating...',
    generatedTitle: 'Generated Questions',
    generatedSubtitle: 'Click "Add to Research" to save a question for deeper exploration.',
    addToResearch: 'Add to Research',
    adding: 'Adding...',
    added: 'Added',
  },
  research: {
    title: 'Research',
    subtitle: 'Manage your research topics. Click a card to view details.',
    errorDismiss: 'Dismiss',
    emptyTitle: 'No research topics yet. Head to ',
    emptyLinkLabel: 'Topic Choice',
    emptyAfterLink: ' to generate questions.',
    statusPending: 'Pending',
    statusInProgress: 'In Progress',
    statusComplete: 'Complete',
    deleteTitle: 'Delete topic',
    conductResearch: 'Conduct Research',
    researching: 'Researching...',
    researchComplete: 'Research Complete',
    addToPostGenerator: 'Add to Post Generator',
    detailFindingsTitle: 'Research Findings',
    detailResearchingTitle: 'Deep Research in Progress',
    detailResearchingSubtitle: 'Gemini is searching the web and analyzing sources',
    detailResearchingTime: 'This typically takes 2 -- 10 minutes',
    detailLatestUpdate: 'Latest Update',
    detailNoFindings: 'No research conducted yet. Click "Conduct Research" to begin.',
    detailSourcesTitle: 'Sources & Citations',
    detailNoSources: 'Sources will appear here after research.',
    detailConductButton: 'Conduct Research',
    detailDraftButton: 'Draft a Post',
    detailCloseButton: 'Close',
    checkNow: 'Check Now',
    checking: 'Checking...',
    resetResearch: 'Reset',
    resetting: 'Resetting...',
    runningFor: 'Running for',
    lastChecked: 'Last checked',
    geminiStatusLabel: 'Gemini status',
    rawStatusButton: 'Raw Status',
  },
  postGenerator: {
    title: 'Post Generator',
    subtitle: 'Transform research into engaging social media posts.',
    researchSourceTitle: 'Research Source',
    noResearchSelected: 'No research selected. Go to the Research page and click "Add to Post Generator" on a completed topic.',
    sourcesLabel: 'source',
    source: 'source',
    sources: 'sources',
    showFullResearch: 'Show full research',
    showLess: 'Show less',
    targetPlatformTitle: 'Target Platform',
    presetToneTitle: 'Preset Tone',
    customStyleTitle: 'Custom Style Notes',
    customStyleSubtitle: 'Optional. Add specific instructions about voice, format, or angle.',
    customStylePlaceholder: 'e.g. Write like a startup founder sharing lessons learned. Use short punchy sentences. Include a personal anecdote angle...',
    generateButton: 'Generate 5 Posts',
    generatingButton: 'Generating 5 Post Variations...',
    openLastGenerations: 'Open Last Generations',
    previous: 'Previous',
    next: 'Next',
    copy: 'Copy',
    copied: 'Copied',
    saveToDrafts: 'Save to Drafts',
    saving: 'Saving...',
    savedToDrafts: 'Saved to Drafts',
    toneOptions: [
      'Inspirational & Motivational',
      'Educational & Informative',
      'Conversational & Casual',
      'Professional & Authoritative',
      'Storytelling & Narrative',
    ],
    variationLabels: [
      'Hook / Attention-Grabber',
      'Data-Led / Statistics',
      'Storytelling / Narrative',
      'Contrarian / Challenging',
      'Call-to-Action / Engagement',
    ],
    ofLabel: 'of',
  },
  drafts: {
    title: 'Drafts',
    subtitle: 'Manage your saved post drafts. Edit, copy, or delete them.',
    draftSingular: 'draft',
    draftPlural: 'drafts',
    searchPlaceholder: 'Search drafts...',
    filtersButton: 'Filters',
    platformLabel: 'Platform:',
    platformAll: 'All',
    toneLabel: 'Tone:',
    allTones: 'All Tones',
    sortBy: 'Sort by:',
    sortDate: 'Date',
    sortPlatform: 'Platform',
    sortTone: 'Tone',
    emptyNoSaved: 'No saved drafts yet',
    emptyNoMatch: 'No drafts match your filters',
    emptyNoSavedSub: 'Generate posts and save your favorites from the Post Generator.',
    emptyNoMatchSub: 'Try adjusting your search or filter criteria.',
    edit: 'Edit',
    copy: 'Copy',
    copied: 'Copied',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    markAsPosted: 'Mark As Posted',
    delete: 'Delete',
  },
  pastPosts: {
    title: 'Past Posts',
    subtitleCount: 'Posts you\'ve already published.',
    searchPlaceholder: 'Search past posts...',
    emptyNoPostsTitle: 'No past posts yet',
    emptyNoPostsSub: 'When you mark drafts as posted, they\'ll appear here.',
    emptyNoMatchTitle: 'No matching posts',
    emptyNoMatchSub: 'Try adjusting your search terms.',
    postedOn: 'Posted',
    showMore: 'Show more',
    showLess: 'Show less',
  },
  common: {
    xTwitter: 'X (Twitter)',
    linkedin: 'LinkedIn',
  },
};

const nl: Translations = {
  sidebar: {
    topicChoice: 'Onderwerpkeuze',
    research: 'Onderzoek',
    postGenerator: 'Berichtgenerator',
    drafts: 'Concepten',
    pastPosts: 'Gepubliceerde Berichten',
    settings: 'Instellingen',
  },
  topicChoice: {
    title: 'Onderwerpkeuze',
    subtitle: 'Beschrijf je achtergrond en laat AI onderzoeksvragen genereren voor boeiende content.',
    careerLabel: 'Carrière / Functie',
    careerPlaceholder: 'bijv. Senior Productmanager bij een SaaS-bedrijf',
    industryLabel: 'Branche',
    industryPlaceholder: 'bijv. Enterprise B2B Software / FinTech',
    topicLabel: 'Specifiek Onderwerp',
    topicOptional: '(optioneel)',
    topicPlaceholder: 'bijv. AI-gestuurde personalisatie in onboarding-flows',
    errorFillBoth: 'Vul zowel je carrière als je branche in.',
    errorGeneric: 'Er is iets misgegaan. Probeer het opnieuw.',
    errorFailed: 'Toevoegen aan onderzoek mislukt.',
    generateButton: 'Vragen Genereren',
    generating: 'Genereren...',
    generatedTitle: 'Gegenereerde Vragen',
    generatedSubtitle: 'Klik op "Toevoegen aan Onderzoek" om een vraag op te slaan voor verdere verkenning.',
    addToResearch: 'Toevoegen aan Onderzoek',
    adding: 'Toevoegen...',
    added: 'Toegevoegd',
  },
  research: {
    title: 'Onderzoek',
    subtitle: 'Beheer je onderzoeksonderwerpen. Klik op een kaart voor details.',
    errorDismiss: 'Sluiten',
    emptyTitle: 'Nog geen onderzoeksonderwerpen. Ga naar ',
    emptyLinkLabel: 'Onderwerpkeuze',
    emptyAfterLink: ' om vragen te genereren.',
    statusPending: 'Wachtend',
    statusInProgress: 'Bezig',
    statusComplete: 'Voltooid',
    deleteTitle: 'Onderwerp verwijderen',
    conductResearch: 'Onderzoek Uitvoeren',
    researching: 'Onderzoeken...',
    researchComplete: 'Onderzoek Voltooid',
    addToPostGenerator: 'Toevoegen aan Berichtgenerator',
    detailFindingsTitle: 'Onderzoeksresultaten',
    detailResearchingTitle: 'Diepgaand Onderzoek Bezig',
    detailResearchingSubtitle: 'Gemini doorzoekt het web en analyseert bronnen',
    detailResearchingTime: 'Dit duurt doorgaans 2 tot 10 minuten',
    detailLatestUpdate: 'Laatste Update',
    detailNoFindings: 'Nog geen onderzoek uitgevoerd. Klik op "Onderzoek Uitvoeren" om te beginnen.',
    detailSourcesTitle: 'Bronnen & Citaten',
    detailNoSources: 'Bronnen verschijnen hier na het onderzoek.',
    detailConductButton: 'Onderzoek Uitvoeren',
    detailDraftButton: 'Bericht Opstellen',
    detailCloseButton: 'Sluiten',
    checkNow: 'Nu Controleren',
    checking: 'Controleren...',
    resetResearch: 'Herstellen',
    resetting: 'Herstellen...',
    runningFor: 'Bezig voor',
    lastChecked: 'Laatste controle',
    geminiStatusLabel: 'Gemini status',
    rawStatusButton: 'Ruwe Status',
  },
  postGenerator: {
    title: 'Berichtgenerator',
    subtitle: 'Zet onderzoek om in boeiende sociale mediaposts.',
    researchSourceTitle: 'Onderzoeksbron',
    noResearchSelected: 'Geen onderzoek geselecteerd. Ga naar de Onderzoekspagina en klik op "Toevoegen aan Berichtgenerator" bij een voltooid onderwerp.',
    sourcesLabel: 'bron',
    source: 'bron',
    sources: 'bronnen',
    showFullResearch: 'Volledig onderzoek tonen',
    showLess: 'Minder tonen',
    targetPlatformTitle: 'Doelplatform',
    presetToneTitle: 'Vooraf Ingestelde Toon',
    customStyleTitle: 'Aangepaste Stijlnotities',
    customStyleSubtitle: 'Optioneel. Voeg specifieke instructies toe over stem, opmaak of invalshoek.',
    customStylePlaceholder: 'bijv. Schrijf als een startup-oprichter die geleerde lessen deelt. Gebruik korte, krachtige zinnen. Voeg een persoonlijk anekdotisch element toe...',
    generateButton: '5 Berichten Genereren',
    generatingButton: '5 Berichtvariaties Genereren...',
    openLastGenerations: 'Laatste Generaties Openen',
    previous: 'Vorige',
    next: 'Volgende',
    copy: 'Kopiëren',
    copied: 'Gekopieerd',
    saveToDrafts: 'Opslaan als Concept',
    saving: 'Opslaan...',
    savedToDrafts: 'Opgeslagen als Concept',
    toneOptions: [
      'Inspirerend & Motiverend',
      'Educatief & Informatief',
      'Conversationeel & Informeel',
      'Professioneel & Gezaghebbend',
      'Verhalend & Narratief',
    ],
    variationLabels: [
      'Hook / Aandachtstrekker',
      'Datagestuurd / Statistieken',
      'Verhalend / Narratief',
      'Contrair / Uitdagend',
      'Oproep-tot-Actie / Betrokkenheid',
    ],
    ofLabel: 'van',
  },
  drafts: {
    title: 'Concepten',
    subtitle: 'Beheer je opgeslagen conceptberichten. Bewerk, kopieer of verwijder ze.',
    draftSingular: 'concept',
    draftPlural: 'concepten',
    searchPlaceholder: 'Concepten doorzoeken...',
    filtersButton: 'Filters',
    platformLabel: 'Platform:',
    platformAll: 'Alle',
    toneLabel: 'Toon:',
    allTones: 'Alle Tonen',
    sortBy: 'Sorteren op:',
    sortDate: 'Datum',
    sortPlatform: 'Platform',
    sortTone: 'Toon',
    emptyNoSaved: 'Nog geen opgeslagen concepten',
    emptyNoMatch: 'Geen concepten komen overeen met je filters',
    emptyNoSavedSub: 'Genereer berichten en sla je favorieten op vanuit de Berichtgenerator.',
    emptyNoMatchSub: 'Pas je zoek- of filtercriteria aan.',
    edit: 'Bewerken',
    copy: 'Kopiëren',
    copied: 'Gekopieerd',
    saveChanges: 'Wijzigingen Opslaan',
    cancel: 'Annuleren',
    markAsPosted: 'Markeren als Geplaatst',
    delete: 'Verwijderen',
  },
  pastPosts: {
    title: 'Gepubliceerde Berichten',
    subtitleCount: 'Berichten die je al hebt gepubliceerd.',
    searchPlaceholder: 'Gepubliceerde berichten doorzoeken...',
    emptyNoPostsTitle: 'Nog geen gepubliceerde berichten',
    emptyNoPostsSub: 'Wanneer je concepten markeert als geplaatst, verschijnen ze hier.',
    emptyNoMatchTitle: 'Geen overeenkomende berichten',
    emptyNoMatchSub: 'Pas je zoektermen aan.',
    postedOn: 'Geplaatst',
    showMore: 'Meer tonen',
    showLess: 'Minder tonen',
  },
  common: {
    xTwitter: 'X (Twitter)',
    linkedin: 'LinkedIn',
  },
};

export const translations: Record<Language, Translations> = { en, nl };

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_STORAGE_KEY = 'postcraft_language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return (stored === 'en' || stored === 'nl') ? stored : 'nl';
  });

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
