export function normalizeName(s: string) {
  return (s || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function pickBetterName(current: string, candidate: string) {
  if (!current) return (candidate || "").trim();
  const c = current.trim();
  const d = (candidate || "").trim();
  if (!c && d) return d;
  const spaceC = /\s/.test(c),
    spaceD = /\s/.test(d);
  if (spaceD && !spaceC) return d;
  if (d.length > c.length) return d;
  return c;
}
