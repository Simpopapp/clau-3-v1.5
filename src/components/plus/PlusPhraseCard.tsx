import { useEffect, useState } from "react";

import type { PhraseData } from "@/lib/plus/phrases";
import { lookupPhrase } from "@/lib/plus/phrases";
import { cn } from "@/lib/utils";

interface PlusPhraseCardProps {
  /** Task type da questão (define o arquivo phrases/{type}.json). */
  type: string;
  /** Id da questão. */
  qid: string;
  /** Frases já segmentadas pelo chamador (mesma segmentação do extractor). */
  sentences: string[];
  /** Pack ativo (settings.plus.phraseTranslation). Falso → nada renderiza. */
  enabled: boolean;
}

/**
 * Card do pack "studie-plus" (tradução por frase, tipo 2): lista as frases do
 * texto e expande a tradução (literal + interpretativa) SOMENTE por tap
 * explícito — nunca em hover ou scroll. Uma frase aberta por vez.
 */
export function PlusPhraseCard({ type, qid, sentences, enabled }: PlusPhraseCardProps) {
  const [data, setData] = useState<PhraseData | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const loaded = data !== null;
  useEffect(() => {
    if (!enabled) {
      setData(null);
      setOpen(null);
      return;
    }
    let active = true;
    const mods = import.meta.glob<{ default: PhraseData }>("@/data/plus/phrases/*.json");
    const loader = mods[`/src/data/plus/phrases/${type}.json`];
    const p = loader ? loader() : Promise.reject(new Error("sem dados"));
    p.then((mod) => {
      if (active) setData((mod.default ?? mod) as PhraseData);
    }).catch(() => {
      if (active) setData({});
    });
    return () => {
      active = false;
    };
  }, [enabled, type]);

  if (!enabled) return null;

  const entry = loaded ? (data ?? {})[qid] : undefined;
  const hasData = Boolean(entry && Array.isArray(entry.t) && entry.t.some((t) => t?.l?.trim()));

  if (!hasData) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-serif text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tradução por frase · Studie Plus
        </p>
        <p className="mt-1 text-xs">Tradução de frase não disponível para esta questão.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <p className="font-serif text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tradução por frase · Studie Plus
      </p>
      <ul className="mt-2 space-y-1">
        {sentences.map((s, i) => {
          const t = lookupPhrase(data ?? {}, qid, i);
          const isOpen = open === i;
          return (
            <li key={`${qid}-${i}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                  isOpen ? "bg-secondary" : "hover:bg-secondary",
                )}
              >
                <span className="min-w-0 flex-1 font-serif leading-relaxed text-foreground/90">
                  {s}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 shrink-0 text-xs text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                >
                  ▾
                </span>
              </button>
              {isOpen ? (
                <div className="mb-2 rounded-lg border border-border bg-background px-3 py-2">
                  {t ? (
                    <>
                      <p className="text-sm font-medium text-foreground">{t.l}</p>
                      {t.c ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.c}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Tradução não disponível para esta frase.
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
