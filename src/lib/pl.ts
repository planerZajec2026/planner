/** Polish plural form: 1 grupa, 2–4 grupy (except 12–14), 5+ grup. */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** `"5 grup"` */
export function countPl(n: number, one: string, few: string, many: string): string {
  return `${n} ${pluralPl(n, one, few, many)}`;
}

/** Lowercases and strips diacritics (ł→l included) for search matching. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
