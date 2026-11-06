export interface State {
  id: number;
  name: string;
  code: string;
  slug: string | null;
  description: string | null;
  tagline: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  config?: Record<string, unknown>;
}

export interface StateStats {
  totalStates: number;
  activeStates: number;
  inactiveStates: number;
  featuredStates: number;
}