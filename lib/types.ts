export interface Pin {
  id: string;
  name: string;
  organization: string;
  telegram: string | null;
  email: string;
  image_url: string | null;
  ens: string | null;
  dacc_statement: string | null;
  sector: string;
  quadrant: string;
  x: number;
  y: number;
  created_at: string;
}

export interface PinFormData {
  name: string;
  organization: string;
  telegram: string;
  email: string;
  image: File | null;
  ens: string;
  dacc_statement: string;
  sector: string;
}
