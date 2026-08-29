import type { Brand, Figure, Spool } from "~/lib/types"

export const STARTER_SPOOLS: readonly Spool[] = [
  {
    id: "0d82d004-fb5e-45c2-89c5-e800f32de475",
    name: "Ice Blue",
    hex: "#93d2e6",
  },
  {
    id: "63f2326b-22eb-4650-83e1-22c7e360cf5a",
    name: "Army Dark Green",
    hex: "#777a5b",
  },
  {
    id: "6ecb2cf3-b881-470d-89d0-163ebc1d7f59",
    name: "Green Leaf",
    hex: "#398b55",
  },
  {
    id: "89a921f8-cfb2-4ec4-8c9b-aca24f53c119",
    name: "Marine Blue",
    hex: "#287fac",
  },
  {
    id: "e6773502-ce7a-4461-8a49-7f0d28fbda81",
    name: "Peanut",
    hex: "#e1ba9c",
  },
  { id: "sp-beige", name: "Beige", hex: "#d4b896" },
  { id: "sp-black", name: "Black", hex: "#1a1a1a" },
  { id: "sp-blue", name: "Blue", hex: "#2563eb" },
  { id: "sp-brown", name: "Brown", hex: "#78533a" },
  { id: "sp-dark-blue", name: "Dark Blue", hex: "#1e3a6e" },
  { id: "sp-dark-green", name: "Dark Green", hex: "#166534" },
  { id: "sp-dark-red", name: "Dark Red", hex: "#8b1a1a" },
  { id: "sp-gold", name: "Gold", hex: "#d4a017" },
  { id: "sp-green", name: "Green", hex: "#22c55e" },
  { id: "sp-grey", name: "Grey", hex: "#9ca3af" },
  {
    id: "sp-lemon-yellow",
    name: "Lemon Yellow",
    hex: "#f7e64a",
  },
  { id: "sp-light-blue", name: "Cyan", hex: "#60a5fa" },
  { id: "sp-orange", name: "Orange", hex: "#f97316" },
  { id: "sp-pink", name: "Pink", hex: "#ec4899" },
  { id: "sp-purple", name: "Purple", hex: "#8b5cf6" },
  { id: "sp-red", name: "Red", hex: "#dc2626" },
  { id: "sp-silver", name: "Silver", hex: "#c0c0c0" },
  {
    id: "sp-transparent",
    name: "Transparent",
    hex: "#c8e0f4",
  },
  { id: "sp-white", name: "White", hex: "#f0eeee" },
  { id: "sp-yellow", name: "Yellow", hex: "#eab308" },
]

export const STARTER_BRANDS: readonly Brand[] = [
  {
    id: "4d5b503d-e96b-44bf-bfaa-77a80ecfdb90",
    name: "Marvel",
  },
  {
    id: "fa792920-805b-4a59-bf9f-9c762d8df72d",
    name: "Pokemon",
  },
  {
    id: "fe49ac2e-5592-4fa5-828f-95d1d52f634f",
    name: "Lilo & Stitch",
  },
]

export const STARTER_FIGURES: readonly Figure[] = [
  {
    id: "fig-pikachu",
    name: "Pikachu",
    brandId: "fa792920-805b-4a59-bf9f-9c762d8df72d",
    size: 60,
    notes: "",
    requiredColors: ["sp-yellow", "sp-black", "sp-red", "sp-brown"],
  },
  {
    id: "fig-spiderman",
    name: "Spiderman",
    brandId: "4d5b503d-e96b-44bf-bfaa-77a80ecfdb90",
    size: 60,
    notes: "",
    requiredColors: ["sp-red", "sp-dark-blue", "sp-black", "sp-white"],
  },
  {
    id: "fig-stitch",
    name: "Stitch",
    brandId: "fe49ac2e-5592-4fa5-828f-95d1d52f634f",
    size: 60,
    notes: "",
    requiredColors: [
      "sp-blue",
      "sp-light-blue",
      "sp-purple",
      "sp-pink",
      "sp-black",
      "sp-white",
    ],
  },
]
