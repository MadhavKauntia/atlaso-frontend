"use client";

import React, { useState, useCallback } from "react";
import CoverRenderer from "./CoverRenderer";
import { TEMPLATES } from "@/lib/covers/templates";
import { PAIRINGS } from "@/lib/covers/palette";
import { sanitizeCoverTitle, sanitizeCoverSubtitle } from "@/lib/covers/text-utils";
import type { CoverTemplate } from "@/lib/covers/types";
import type { CoverPairing } from "@/lib/covers/palette";

export interface CoverChangePayload {
  templateId: string;
  paletteId: string;
  title: string;
  subtitle: string;
}

interface CoverEditorProps {
  initialTitle?: string;
  initialSubtitle?: string;
  volumeNumber?: number;
  coordinates?: string;
  onCoverChange?: (payload: CoverChangePayload) => void;
}

const TEMPLATE_LIST = Object.values(TEMPLATES);

export default function CoverEditor({
  initialTitle = "",
  initialSubtitle = "",
  volumeNumber,
  coordinates,
  onCoverChange,
}: CoverEditorProps) {
  const [title, setTitle] = useState(sanitizeCoverTitle(initialTitle));
  const [subtitle, setSubtitle] = useState(sanitizeCoverSubtitle(initialSubtitle));
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_LIST[0].id);
  const [selectedPaletteId, setSelectedPaletteId] = useState(TEMPLATE_LIST[0].paletteId);

  const template: CoverTemplate = TEMPLATES[selectedTemplateId];
  const pairing: CoverPairing = PAIRINGS[selectedPaletteId];

  const compatiblePairings = template.compatiblePalettes
    .map((id) => PAIRINGS[id])
    .filter(Boolean);

  const emit = useCallback(
    (t: string, sub: string, tmplId: string, palId: string) => {
      onCoverChange?.({ templateId: tmplId, paletteId: palId, title: t, subtitle: sub });
    },
    [onCoverChange]
  );

  function handleTitle(e: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = sanitizeCoverTitle(e.target.value);
    setTitle(sanitized);
    emit(sanitized, subtitle, selectedTemplateId, selectedPaletteId);
  }

  function handleSubtitle(e: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = sanitizeCoverSubtitle(e.target.value);
    setSubtitle(sanitized);
    emit(title, sanitized, selectedTemplateId, selectedPaletteId);
  }

  function handleSelectTemplate(id: string) {
    const tmpl = TEMPLATES[id];
    const newPaletteId = tmpl.compatiblePalettes.includes(selectedPaletteId)
      ? selectedPaletteId
      : tmpl.paletteId;
    setSelectedTemplateId(id);
    setSelectedPaletteId(newPaletteId);
    emit(title, subtitle, id, newPaletteId);
  }

  function handleSelectPalette(id: string) {
    setSelectedPaletteId(id);
    emit(title, subtitle, selectedTemplateId, id);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* Controls */}
      <div className="flex flex-col gap-6 lg:w-80 flex-shrink-0">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-widest uppercase text-gray-500">
            Destination
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitle}
            maxLength={12}
            placeholder="Your destination"
            className="w-full px-3 py-2.5 text-lg font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
          />
          <span className="text-xs text-gray-400 text-right">{title.length}/12</span>
        </div>

        {/* Subtitle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-widest uppercase text-gray-500">
            Description
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={handleSubtitle}
            maxLength={40}
            placeholder="e.g., a week in spring"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
          />
          <span className="text-xs text-gray-400 text-right">{subtitle.length}/40</span>
        </div>

        {/* Template selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium tracking-widest uppercase text-gray-500">
            Style
          </label>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {TEMPLATE_LIST.map((tmpl) => {
              const tmplPairing =
                PAIRINGS[
                  tmpl.compatiblePalettes.includes(selectedPaletteId)
                    ? selectedPaletteId
                    : tmpl.paletteId
                ];
              const isActive = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden transition-all duration-150 ${
                    isActive
                      ? "ring-2 ring-gray-900 ring-offset-2 scale-105"
                      : "ring-1 ring-gray-200 hover:scale-103 hover:ring-gray-400"
                  }`}
                  style={{ width: 72, height: 96 }}
                  title={tmpl.name}
                >
                  <CoverRenderer
                    template={tmpl}
                    pairing={tmplPairing}
                    title={title || tmpl.name.toUpperCase()}
                    subtitle=""
                    mode="preview"
                    className="w-full h-full"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Palette selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium tracking-widest uppercase text-gray-500">
            Palette
          </label>
          <div className="flex flex-wrap gap-2">
            {compatiblePairings.map((p) => {
              const isActive = p.id === selectedPaletteId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPalette(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-150 ${
                    isActive
                      ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  title={p.name}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ background: p.background }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ background: p.accent }}
                  />
                  <span className="text-xs text-gray-600 whitespace-nowrap">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center gap-3 flex-1">
        <div
          className="w-full max-w-xs lg:max-w-sm"
          style={{ transition: "background-color 200ms ease" }}
        >
          <CoverRenderer
            template={template}
            pairing={pairing}
            title={title}
            subtitle={subtitle}
            volumeNumber={volumeNumber}
            coordinates={coordinates}
            mode="preview"
            className="w-full rounded-lg shadow-xl"
          />
        </div>
        <p className="text-xs text-gray-400 text-center">
          {coordinates && <span>{coordinates} · </span>}
          This is how your cover will print
        </p>
      </div>
    </div>
  );
}
