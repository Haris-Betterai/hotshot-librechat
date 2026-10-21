import { useEffect } from 'react';
import { useGetStartupConfig } from '~/data-provider';

const SCRIPT_ID = 'hotshot-site-widget';
const WIDGET_ROOT_ID = 'hotshot-embed-widget';

type WidgetWindow = Window & { __hotshotEmbedLoaded?: boolean };

/** Shows the same floating embed widget customers' sites use on the public chat pages. */
export default function SiteWidget() {
  const { data: startupConfig } = useGetStartupConfig();
  const embedId = startupConfig?.siteWidgetEmbedId;

  useEffect(() => {
    if (!embedId || document.getElementById(SCRIPT_ID)) {
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'embed.js';
    script.async = true;
    script.setAttribute('data-embed-id', embedId);
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.getElementById(WIDGET_ROOT_ID)?.remove();
      delete (window as WidgetWindow).__hotshotEmbedLoaded;
    };
  }, [embedId]);

  return null;
}
