import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "1 line", "3 lines" — for nouns that pluralize with a trailing "s". */
export function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}
