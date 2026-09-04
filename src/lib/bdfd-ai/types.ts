export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface RagQueryResult {
  text: string;
  /** Extra context from fetched paste / txt URLs in the user message */
  externalContext?: string;
}
