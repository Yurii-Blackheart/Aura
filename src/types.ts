export type ModuleType = 'hub' | 'portfolio' | 'blog' | 'garden' | 'health' | 'book' | 'lore-graph' | 'world-map';

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
  details: string;
  results: string[];
  techStack: string[];
  images?: string[];
  isDraft?: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  readTime: string;
  tags: string[];
  reactions: {
    like: number;
    insight: number;
    heart: number;
  };
  isDraft?: boolean;
}

export interface GardenNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  connectedNotes: string[]; // IDs of other GardenNotes
  secondaryConnections?: string[]; // IDs of notes connected via dashed lines
  isHubNode?: boolean;
  isDraft?: boolean;
}

export interface HealthProtocol {
  id: string;
  title: string;
  description: string;
  category: 'сон' | 'фокус' | 'довголіття' | 'фізична-активність';
  target: string;
  schedule: string;
  steps: { id: string; text: string; done: boolean }[];
  scientificRationale: string;
  supplements: { name: string; dosage: string; timing: string }[];
  isDraft?: boolean;
}

export interface BookChapter {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  readingTime: string;
  lore: { title: string; text: string }[];
  isDraft?: boolean;
}

export interface ChangelogEvent {
  id: string;
  time: string; // e.g. "Сьогодні", "Вчора", "2 дні тому"
  timestamp: Date;
  description: string;
  module: ModuleType;
  type: 'оновлення' | 'досягнення' | 'публікація';
  targetId: string; // links to module item ID
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  module: ModuleType;
  typeLabel: string;
}
