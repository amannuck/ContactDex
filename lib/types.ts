export interface Interaction {
  note: string;
  date: string;
}

export interface Contact {
  id: string;
  name: string;
  bio: string;
  tags: string[];
  moveset: string[];
  stage: number;
  interactions: Interaction[];
  createdAt: string;
  avatar?: string;
}
