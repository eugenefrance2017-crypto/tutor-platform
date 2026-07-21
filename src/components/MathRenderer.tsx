"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    MathJax?: any;
  }
}

export default function MathRenderer({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.MathJax) {
      // Загружаем MathJax
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true;
      document.head.appendChild(script);

      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
        },
        startup: {
          ready: () => {
            window.MathJax.startup.defaultReady();
          }
        }
      };
    }
  }, []);

  useEffect(() => {
    if (ref.current && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, [text]);

  // Преобразуем простые формулы в LaTeX
  const processedText = text
    .replace(/H_2O/g, '$H_2O$')
    .replace(/CO_2/g, '$CO_2$')
    .replace(/Na\^+/g, '$Na^+$')
    .replace(/Cl\^-/g, '$Cl^-$')
    .replace(/Ca\^2\+/g, '$Ca^{2+}$')
    .replace(/SO_4\^2-/g, '$SO_4^{2-}$')
    .replace(/->/g, '$\\rightarrow$')
    .replace(/<=>/g, '$\\rightleftharpoons$');

  return <div ref={ref} className={className}>{processedText}</div>;
}