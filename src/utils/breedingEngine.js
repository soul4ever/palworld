// src/utils/breedingEngine.js
export class BreedingEngine {
  constructor(pals, uniqueCombos, directional) {
    this.rankByCode = new Map();
    this.umap = new Map();
    this.directional = new Map();

    for (const p of pals) this.rankByCode.set(p.code, p.rank);

    for (const [k, entries] of Object.entries(directional || {})) {
      this.directional.set(k, entries);
    }

    for (const [a, b, c] of uniqueCombos) {
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!this.directional.has(k)) this.umap.set(k, c);
    }

    this.eligible = pals
      .filter(p => p.rankResult)
      .map(p => ({ code: p.code, rank: p.rank }))
      .sort((x, y) => x.rank - y.rank);
    this.eranks = this.eligible.map(e => e.rank);
  }

  breed(a, b) {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;

    const dir = this.directional.get(key);
    if (dir) {
      return { child: dir[0][2], child2: dir[1][2], kind: 'directional' };
    }

    const uniqueChild = this.umap.get(key);
    if (uniqueChild !== undefined) {
      return { child: uniqueChild, kind: 'unique' };
    }

    if (a === b) {
      return { child: a, kind: 'identity' };
    }

    const rankA = this.rankByCode.get(a);
    const rankB = this.rankByCode.get(b);
    if (rankA === undefined || rankB === undefined) {
      throw new Error(`unknown pal code: ${rankA === undefined ? a : b}`);
    }
    const childRank = Math.floor((rankA + rankB + 1) / 2);
    return {
      child: this.nearest(childRank),
      kind: 'rank',
      rankMath: { childRank, rankA, rankB },
    };
  }

  nearest(target) {
    const eranks = this.eranks;
    const eligible = this.eligible;
    let lo = 0, hi = eranks.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (eranks[m] < target) lo = m + 1;
      else hi = m;
    }
    let best = eligible[lo];
    let bestDist = Math.abs(eranks[lo] - target);
    for (const i of [lo - 1, lo + 1]) {
      if (i < 0 || i >= eranks.length) continue;
      const d = Math.abs(eranks[i] - target);
      if (d < bestDist || (d === bestDist && eranks[i] > best.rank)) {
        best = eligible[i];
        bestDist = d;
      }
    }
    return best.code;
  }
}