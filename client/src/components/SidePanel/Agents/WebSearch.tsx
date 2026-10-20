import { useState, useEffect } from 'react';
import { Switch } from '@librechat/client';
import { useWatch, useFormContext } from 'react-hook-form';
import {
  EModelEndpoint,
  parseWebSearchDomains,
  SUGGESTED_WEB_SEARCH_DOMAIN,
} from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';

export default function WebSearch() {
  const localize = useLocalize();
  const { control, setValue } = useFormContext<AgentForm>();
  const provider = useWatch({ control, name: 'provider' });
  const enabled = useWatch({ control, name: 'model_parameters.web_search' }) === true;
  const domains = useWatch({ control, name: 'model_parameters.web_search_domains' });
  const [text, setText] = useState('');

  const providerValue = typeof provider === 'string' ? provider : provider?.value;
  const storedText = Array.isArray(domains) ? domains.join('\n') : '';

  useEffect(() => {
    setText(storedText);
  }, [storedText]);

  if (providerValue !== EModelEndpoint.openAI) {
    return null;
  }

  const setDomains = (value: string[]) =>
    setValue('model_parameters.web_search_domains', value, { shouldDirty: true });

  const handleToggle = (checked: boolean) => {
    setValue('model_parameters.web_search', checked, { shouldDirty: true });
    if (checked && !domains?.length) {
      setDomains([SUGGESTED_WEB_SEARCH_DOMAIN]);
    }
  };

  const handleBlur = () => {
    const parsed = parseWebSearchDomains(text);
    setText(parsed.join('\n'));
    setDomains(parsed);
  };

  return (
    <div className="mb-3 rounded-lg border border-border-light p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="agent-web-search" className="text-sm font-medium text-text-primary">
          {localize('com_ui_web_search')}
        </label>
        <Switch
          id="agent-web-search"
          checked={enabled}
          onCheckedChange={handleToggle}
          aria-label={localize('com_ui_web_search')}
        />
      </div>
      <p className="mt-1 text-xs text-text-secondary">{localize('com_ui_agent_web_search_hint')}</p>
      {enabled && (
        <div className="mt-2 flex flex-col">
          <label
            htmlFor="agent-web-search-domains"
            className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-text-secondary"
          >
            {localize('com_ui_agent_web_search_domains')}
          </label>
          <textarea
            id="agent-web-search-domains"
            value={text}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder={SUGGESTED_WEB_SEARCH_DOMAIN}
            aria-describedby="agent-web-search-domains-help"
            className="w-full resize-none rounded-lg border border-border-light bg-transparent p-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
          />
          <p id="agent-web-search-domains-help" className="mt-1 text-xs text-text-secondary">
            {localize('com_ui_agent_web_search_domains_hint')}
          </p>
        </div>
      )}
    </div>
  );
}
