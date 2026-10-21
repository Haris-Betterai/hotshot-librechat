import { useEffect, useMemo } from 'react';
import { normalizeEmbedWidgetSettings } from 'librechat-data-provider';
import type { TEmbedWidgetSettings } from 'librechat-data-provider';
import { useGetEmbedWidgetConfigQuery } from '~/data-provider';
import { getEmbedWidgetId, isEmbedWidget } from '~/utils/embed';

export type EmbedWidgetSettingsResult = {
  settings: TEmbedWidgetSettings;
  iconUrl?: string;
  isEmbed: boolean;
};

export type EmbedComposerControls = {
  intelligence: boolean;
  voice: boolean;
  attach: boolean;
  poweredBy: boolean;
};

/** Which composer controls to show; outside embed mode everything keeps its normal behaviour. */
export function getEmbedComposerControls(
  settings: TEmbedWidgetSettings,
  isEmbed: boolean,
): EmbedComposerControls {
  return {
    intelligence: !isEmbed || settings.showIntelligence,
    voice: !isEmbed || settings.allowVoice,
    attach: !isEmbed || settings.allowFileUpload,
    poweredBy: isEmbed && settings.showPoweredBy,
  };
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Settings for the embed this iframe serves; defaults when not embedded or still loading. */
export default function useEmbedWidgetSettings(): EmbedWidgetSettingsResult {
  const isEmbed = isEmbedWidget();
  const { data } = useGetEmbedWidgetConfigQuery(isEmbed ? getEmbedWidgetId() : undefined);

  return useMemo(
    () => ({
      isEmbed,
      iconUrl: data?.iconUrl ?? undefined,
      settings: normalizeEmbedWidgetSettings(isEmbed ? data?.settings : undefined),
    }),
    [isEmbed, data],
  );
}

/**
 * Applies the brand colour (`--embed-brand`) and light/dark/auto theme to the document root in
 * embed mode only. The theme class is set directly, so the visitor's stored app theme is untouched.
 */
export function useEmbedAppearance(): void {
  const { settings, isEmbed } = useEmbedWidgetSettings();
  const { color, theme } = settings;

  useEffect(() => {
    if (!isEmbed) {
      return;
    }
    const root = document.documentElement;
    root.style.setProperty('--embed-brand', color);
    return () => {
      root.style.removeProperty('--embed-brand');
    };
  }, [isEmbed, color]);

  useEffect(() => {
    if (!isEmbed) {
      return;
    }
    const root = document.documentElement;
    const query = window.matchMedia(DARK_QUERY);
    const wantsDark = () => (theme === 'auto' ? query.matches : theme === 'dark');
    const apply = () => {
      const dark = wantsDark();
      const target = dark ? 'dark' : 'light';
      const other = dark ? 'light' : 'dark';
      if (root.classList.contains(target) && !root.classList.contains(other)) {
        return;
      }
      root.classList.remove(other);
      root.classList.add(target);
    };
    apply();
    /** The app's ThemeProvider re-applies the visitor's theme on its own schedule; keep ours. */
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    query.addEventListener?.('change', apply);
    return () => {
      observer.disconnect();
      query.removeEventListener?.('change', apply);
    };
  }, [isEmbed, theme]);
}
