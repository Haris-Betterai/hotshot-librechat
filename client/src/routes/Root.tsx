import { useState, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useMediaQuery, Spinner } from '@librechat/client';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  PromptGroupsProvider,
  AssistantsMapContext,
  AgentsMapContext,
  SetConvoProvider,
  FileMapContext,
} from '~/Providers';
import {
  useSearchEnabled,
  useAssistantsMap,
  useAuthContext,
  useAgentsMap,
  useFileMap,
} from '~/hooks';
import KeyboardShortcutsDialog from '~/components/Nav/KeyboardShortcutsDialog';
import KeyboardDeleteDialog from '~/components/Nav/KeyboardDeleteDialog';
import { useUserTermsQuery, useGetStartupConfig } from '~/data-provider';
import { isEmbedWidget, isStaffPath, publicHomePath, guestRedirectTarget } from '~/utils';
import useKeyboardShortcuts from '~/hooks/useKeyboardShortcuts';
import { UnifiedSidebar } from '~/components/UnifiedSidebar';
import { TermsAndConditionsModal } from '~/components/ui';
import { useHealthCheck } from '~/data-provider';
import { useEmbedAppearance } from '~/hooks/useEmbedWidgetSettings';
import SiteWidget from '~/components/Chat/SiteWidget';
import { FeedbackTab } from '~/components/Feedback';
import useViewer from '~/hooks/useViewer';
import { Banner } from '~/components/Banners';
import store from '~/store';

/** Workspace pages a signed-up customer can't open; they only keep their chat history. */
const MEMBER_BLOCKED_PATH = /^\/(agents|prompts|skills|projects)(\/|$)/;

/** Isolates keyboard shortcut listeners so they only mount after auth. */
function KeyboardShortcutsProvider() {
  useKeyboardShortcuts();
  return (
    <>
      <KeyboardShortcutsDialog />
      <KeyboardDeleteDialog />
    </>
  );
}

export default function Root() {
  const [showTerms, setShowTerms] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const sidebarExpanded = useRecoilValue(store.sidebarExpanded);
  const setSpeechToText = useSetRecoilState(store.speechToText);
  useEmbedAppearance();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthContext();
  const { isGuest, isMember, isSettled } = useViewer();
  const isEmbed = isEmbedWidget();
  const isStaffView = isStaffPath(location.pathname);
  const isAgentBuilderPage = location.pathname.startsWith('/staff/agent-builder');
  const hasSidebar = !isEmbed && !isAgentBuilderPage && (isStaffView || isMember);
  const shiftForSidebar = isSmallScreen && sidebarExpanded && hasSidebar;
  const awaitingStaffCheck = isStaffView && !isGuest && !isSettled;

  useHealthCheck(isAuthenticated);

  useEffect(() => {
    if (isStaffView && (isGuest || isMember)) {
      navigate(guestRedirectTarget(location.pathname, location.search, location.hash), {
        replace: true,
      });
      return;
    }
    if (isMember && MEMBER_BLOCKED_PATH.test(location.pathname)) {
      navigate(publicHomePath(), { replace: true });
    }
  }, [isStaffView, isGuest, isMember, navigate, location.pathname, location.search, location.hash]);

  const assistantsMap = useAssistantsMap({ isAuthenticated });
  const agentsMap = useAgentsMap({ isAuthenticated });
  const fileMap = useFileMap({ isAuthenticated });

  const { data: config } = useGetStartupConfig();
  const { data: termsData } = useUserTermsQuery({
    enabled: isAuthenticated && config?.interface?.termsOfService?.modalAcceptance === true,
  });

  useSearchEnabled(isAuthenticated);

  useEffect(() => {
    document.documentElement.classList.toggle('embed-widget', isEmbed);
    if (isEmbed) {
      setSpeechToText(true);
    }
    return () => {
      document.documentElement.classList.remove('embed-widget');
    };
  }, [isEmbed, setSpeechToText]);

  useEffect(() => {
    if (termsData) {
      setShowTerms(!termsData.termsAccepted);
    }
  }, [termsData]);

  const handleAcceptTerms = () => {
    setShowTerms(false);
  };

  const handleDeclineTerms = () => {
    setShowTerms(false);
    logout('/login?redirect=false');
  };

  if (!isAuthenticated || awaitingStaffCheck) {
    return (
      <div className="flex h-screen items-center justify-center" aria-live="polite" role="status">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  return (
    <SetConvoProvider>
      <FileMapContext.Provider value={fileMap}>
        <AssistantsMapContext.Provider value={assistantsMap}>
          <AgentsMapContext.Provider value={agentsMap}>
            <PromptGroupsProvider>
              {!isEmbed && <Banner onHeightChange={setBannerHeight} />}
              {!isEmbed && !isStaffView && <SiteWidget />}
              {!isEmbed && !isStaffView && <FeedbackTab />}
              <div className="flex" style={{ height: `calc(100dvh - ${bannerHeight}px)` }}>
                <div className="relative z-0 flex h-full w-full overflow-hidden">
                  {hasSidebar && <UnifiedSidebar />}
                  <div
                    className="relative flex h-full max-w-full flex-1 flex-col overflow-hidden"
                    style={{
                      transform: shiftForSidebar ? 'translateX(min(85vw, 380px))' : 'none',
                      transition: 'transform 300ms cubic-bezier(0.2, 0, 0, 1)',
                    }}
                    inert={shiftForSidebar ? '' : undefined}
                  >
                    <Outlet />
                  </div>
                </div>
              </div>
            </PromptGroupsProvider>
          </AgentsMapContext.Provider>
          {config?.interface?.termsOfService?.modalAcceptance === true && (
            <TermsAndConditionsModal
              open={showTerms}
              onOpenChange={setShowTerms}
              onAccept={handleAcceptTerms}
              onDecline={handleDeclineTerms}
              title={config.interface.termsOfService.modalTitle}
              modalContent={config.interface.termsOfService.modalContent}
            />
          )}
          <KeyboardShortcutsProvider />
        </AssistantsMapContext.Provider>
      </FileMapContext.Provider>
    </SetConvoProvider>
  );
}
