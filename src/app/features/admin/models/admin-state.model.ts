export interface AdminState {
  id: number;
  name: string;
  imageUrl: string | null;
  tagline: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStateDetail extends AdminState {
  code: string;
  slug: string | null;
  description: string | null;
  config: Record<string, unknown>;
}

export interface StateStats {
  totalStates: number;
  activeStates: number;
  inactiveStates: number;
  featuredStates: number;
}

export interface StateRequest {
  name: string;
  code: string;
  slug: string | null;
  tagline: string | null;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  config: Record<string, unknown>;
}