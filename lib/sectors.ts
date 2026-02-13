export interface Sector {
  name: string;
  quadrant: string;
}

export const SECTORS: Sector[] = [
  { name: "Resilient Manufacturing", quadrant: "Physical Defense" },
  { name: "Open Source Hardware & Silicon", quadrant: "Physical Defense" },
  { name: "Biodefense & Health Systems", quadrant: "Physical Defense" },
  { name: "Property Rights & Registries", quadrant: "Physical Coordination" },
  { name: "Decentralized Energy", quadrant: "Physical Coordination" },
  { name: "Civic Tech", quadrant: "Physical Coordination" },
  { name: "Carbon & Environmental Markets", quadrant: "Physical Coordination" },
  { name: "Privacy-Preserving Computation", quadrant: "Digital Defense" },
  { name: "Zero-Knowledge Systems", quadrant: "Digital Defense" },
  { name: "Decentralized Identity & Attestation", quadrant: "Digital Defense" },
  { name: "Formal Verification & Security", quadrant: "Digital Defense" },
  { name: "Secrets-as-a-Service", quadrant: "Digital Defense" },
  { name: "Communication & Messaging", quadrant: "Digital Defense" },
  { name: "Governance Tooling", quadrant: "Digital Coordination" },
  { name: "Decentralized Monetary Infrastructure", quadrant: "Digital Coordination" },
  { name: "Epistemic Infrastructure", quadrant: "Digital Coordination" },
  { name: "Democratic Funding Mechanisms", quadrant: "Digital Coordination" },
  { name: "Oracle Networks", quadrant: "Digital Coordination" },
  { name: "Cross-Chain Infrastructure", quadrant: "Digital Coordination" },
  { name: "Data Availability & Storage", quadrant: "Digital Coordination" },
  { name: "Streaming & Treasury", quadrant: "Digital Coordination" },
  { name: "Ecosystem Connector", quadrant: "Digital Coordination" },
];

export const QUADRANTS = [
  "Physical Defense",
  "Physical Coordination",
  "Digital Defense",
  "Digital Coordination",
] as const;
