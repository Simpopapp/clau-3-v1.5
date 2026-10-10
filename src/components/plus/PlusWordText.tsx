import { useEffect, useMemo, useRef, useState } from "react";

import type { Glossary } from "@/lib/plus/glossary";
import { lookupWord } from "@/lib/plus/glossary";
import { splitWords } from "@/lib/plus/words";
import { cn } from "@/lib/utils";

interface PlusWordTextProps {
  text: string;
  /** Pack ativo (settings.plus.wordTranslation). Falso → parágrafo comum. */
  enabled: boolean;
  /** Classes do parágrafo (o motor decide o tamanho/tipografia). */
  className?: string;
  /** Renderiza <span> em vez de <p> (para trechos dentro de outro bloco). */
  inline?: boolean;
}

/**
 * Parágrafo do pack "studie-plus": cada palavra é alvo de toque que abre um
 * balão fixo com tradução literal + nota contextual. Abre SOMENTE por tap
 * explícito (nunca em hover/scroll); fecha por toque fora, ✕ ou Esc.
 */
export function PlusWordText({ text, enabled, className, inline }: PlusWordTextProps) {
  const [glossary, setGlossary] = useState<Glossary | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<(HTMLElement | null)[]>([]);

  // Glossário carregado por import dinâmico, só quando o recurso está ativo.
  useEffect(() => {
    let active = true;
    if (enabled) {
      import("@/data/plus/glossary.json")
        .then((mod) => {
          if (active) setGlossary((mod.default ?? mod) as Glossary);
        })
        .catch(() => {
          if (active) setGlossary({});
        });
    } else {
      setGlossary(null);
      setOpen(null);
      setAnchor(null);
    }
    return () => {
      active = false;
    };
  }, [enabled]);

  const parts = useMemo(() => splitWords(text), [text]);
  const interactive = enabled && glossary !== null;

  const openAt = (i: number, el: HTMLElement) => {
    if (open === i) {
      setOpen(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const width = 300;
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - width - 8));
    setOpen(i);
    setAnchor({ top: r.bottom + 6, left });
  };

  const toggleAt = (i: number) => {
    const el = spanRefs.current[i];
    if (el) openAt(i, el);
  };

  // Fecha por toque fora (fora do balão e fora do texto) ou Esc.
  useEffect(() => {
    if (open === null) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      const insideText = rootRef.current?.contains(target) ?? false;
      if (insideText) return;
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!interactive) {
    return inline ? (
      <span
        ref={(el) => {
          rootRef.current = el;
        }}
        className={className}
      >
        {text}
      </span>
    ) : (
      <p
        ref={(el) => {
          rootRef.current = el;
        }}
        className={className}
      >
        {text}
      </p>
    );
  }

  const entry = open !== null ? lookupWord(glossary ?? {}, parts.tokens[open]?.core ?? "") : null;

  const tokens = parts.tokens.map((t, i) => (
    <span
      key={`${t.core}-${i}`}
      ref={(el) => {
        spanRefs.current[i] = el;
      }}
      role="button"
      tabIndex={0}
      aria-label={`Traduzir ${t.core}`}
      onClick={() => toggleAt(i)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleAt(i);
        }
      }}
      className={cn(
        "inline-block cursor-pointer whitespace-pre rounded-sm px-0.5",
        open === i ? "bg-secondary" : "hover:bg-secondary",
      )}
    >
      {t.core + t.trail}
    </span>
  ));

  const body = (
    <>
      {parts.lead ? parts.lead : null}
      {tokens}
    </>
  );

  return (
    <>
      {inline ? (
        <span
          ref={(el) => {
            rootRef.current = el;
          }}
          className={className}
        >
          {body}
        </span>
      ) : (
        <p
          ref={(el) => {
            rootRef.current = el;
          }}
          className={className}
        >
          {body}
        </p>
      )}

      {open !== null && anchor ? (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Tradução da palavra"
          className="fixed z-50 w-[280px] max-w-[calc(100vw-16px)] rounded-xl border border-border bg-popover p-3 shadow-lg"
          style={{ top: anchor.top, left: anchor.left }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {parts.tokens[open]?.core}
            </p>
            <button
              type="button"
              aria-label="Fechar tradução"
              onClick={() => setOpen(null)}
              className="rounded-md px-1.5 py-0.5 text-muted-foreground hover:bg-secondary"
            >
              ✕
            </button>
          </div>
          {entry ? (
            <>
              <p className="mt-1 text-sm font-medium text-foreground">{entry.literal}</p>
              {entry.contextual ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {entry.contextual}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Tradução não disponível para esta palavra.
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
