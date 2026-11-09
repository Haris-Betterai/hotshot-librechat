import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { ClipboardList, MessagesSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserKeyQuery } from 'librechat-data-provider/react-query';
import {
  SystemRoles,
  EModelEndpoint,
  getConfigDefaults,
  getEndpointField,
} from 'librechat-data-provider';
import type { TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';
import { useGetEndpointsQuery, useGetStartupConfig } from '~/data-provider';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import { useAuthContext } from '~/hooks/AuthContext';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

export default function useUnifiedSidebarLinks() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const isAdmin = user?.role === SystemRoles.ADMIN;
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const endpoint = conversation?.endpoint;
  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'type'),
    [endpoint, endpointsConfig],
  );

  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );

  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '');

  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  const sideNavLinks = useSideNavLinks({
    keyProvided,
    endpoint,
    endpointType,
    interfaceConfig,
    endpointsConfig,
    includeHidePanel: false,
  });

  const links = useMemo(() => {
    const conversationLink: NavLink = {
      title: 'com_ui_chat_history',
      label: '',
      icon: MessagesSquare,
      id: 'conversations',
      Component: ConversationsSection,
    };

    const staffLinks = sideNavLinks.map((link) => {
      if (link.id !== EModelEndpoint.agents) {
        return link;
      }
      return {
        ...link,
        onClick: () => {
          const query = conversation?.agent_id
            ? `?agent_id=${encodeURIComponent(conversation.agent_id)}`
            : '';
          navigate(`/staff/agent-builder${query}`);
        },
      };
    });

    const reviewLink: NavLink = {
      title: 'com_ui_review_title',
      label: '',
      icon: ClipboardList,
      id: 'review',
      onClick: () => navigate('/staff/review'),
    };

    return isAdmin
      ? [conversationLink, ...staffLinks, reviewLink]
      : [conversationLink, ...staffLinks];
  }, [sideNavLinks, conversation?.agent_id, navigate, isAdmin]);

  return links;
}
