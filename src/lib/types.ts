export interface GenerateRequest {
  url: string;
  authMethod: 'none' | 'credentials' | 'gmail' | 'manual';
  username?: string;
  password?: string;
  maxPages?: number;
  language?: 'zh-TW' | 'zh-CN' | 'en';
  includeSubpages?: boolean;
}

export interface PageCapture {
  url: string;
  title: string;
  screenshotPath: string;
  screenshotBase64?: string;
  elements: PageElement[];
  navigationDepth: number;
  parentUrl?: string;
  timestamp: number;
}

export interface PageElement {
  type: 'button' | 'link' | 'input' | 'select' | 'menu' | 'tab' | 'form' | 'other';
  text: string;
  selector: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface AIAnalysis {
  pageTitle: string;
  pageDescription: string;
  functionCategory: string;
  steps: OperationStep[];
  tips: string[];
  warnings: string[];
}

export interface OperationStep {
  stepNumber: number;
  action: string;
  description: string;
  elementRef?: string;
}

export interface SOPSection {
  id: string;
  title: string;
  category: string;
  description: string;
  screenshotPath: string;
  screenshots?: string[];
  screenshotBase64?: string;
  steps: OperationStep[];
  tips: string[];
  warnings: string[];
  subSections?: SOPSection[];
}

export interface SOPDocument {
  title: string;
  generatedAt: string;
  sourceUrl: string;
  tableOfContents: TOCEntry[];
  sections: SOPSection[];
}

export interface TOCEntry {
  id: string;
  title: string;
  level: number;
  children?: TOCEntry[];
}

export type TaskStatus = 'pending' | 'waiting_login' | 'crawling' | 'analyzing' | 'generating' | 'completed' | 'error';

export interface TaskProgress {
  id: string;
  status: TaskStatus;
  progress: number; // 0-100
  currentStep: string;
  totalPages: number;
  processedPages: number;
  error?: string;
  resultPath?: string;
  pages: PageCapture[];
  analyses: AIAnalysis[];
}
