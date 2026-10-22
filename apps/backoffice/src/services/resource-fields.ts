export interface Field {
  key: string;
  label: string;
  kind: string;
  required?: boolean;
  options?: Option[];
  reference?: string;
  multiple?: boolean;
  minimum?: number;
  maximum?: number;
  appliesTo?: string;
  virtual?: boolean;
}
export interface Option {
  value: string;
  label: string;
}
