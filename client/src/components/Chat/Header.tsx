import { memo, useMemo, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery, Button } from '@librechat/client';
import { getConfigDefaults, PermissionTypes, Permissions } from 'librechat-data-provider';
import ModelSelector from './Menus/Endpoints/ModelSelector';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { OpenSidebar, PresetsMenu } from './Menus';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import AddMultiConvo from './AddMultiConvo';
import { useAuthContext, useHasAccess, useLocalize } from '~/hooks';
import { useChatContext, useAgentsMapContext } from '~/Providers';
import NewChat from '~/components/Nav/NewChat';
import { cn, isEmbedWidget, isStaffPath, markStaffLoginIntent, publicHomePath, staffHomePath } from '~/utils';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

function Header() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const isGuest = user?.provider === 'anonymous';
  const isEmbed = isEmbedWidget();
  const isStaffView = isStaffPath(location.pathname);
  const isPublicChrome = !isEmbed && !isStaffView;
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const { data: startupConfig } = useGetStartupConfig();
  const navVisible = useRecoilValue(store.sidebarExpanded);

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const hasAccessToMultiConvo = useHasAccess({
    permissionType: PermissionTypes.MULTI_CONVO,
    permission: Permissions.USE,
  });

  const hasAccessToTemporaryChat = useHasAccess({
    permissionType: PermissionTypes.TEMPORARY_CHAT,
    permission: Permissions.USE,
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const openStaffLogin = useCallback(() => {
    markStaffLoginIntent();
    navigate('/login?staff=1');
    logout('/login?staff=1');
  }, [logout, navigate]);

  const staffLoginButton =
    isPublicChrome && isGuest && startupConfig?.publicGuestMode === true ? (
      <Button
        size="sm"
        variant="outline"
        aria-label={localize('com_ui_staff_login')}
        onClick={openStaffLogin}
      >
        {localize('com_ui_staff_login')}
      </Button>
    ) : null;

  const staffWorkspaceButton =
    isPublicChrome && !isGuest ? (
      <Button
        size="sm"
        variant="outline"
        aria-label={localize('com_ui_staff_workspace')}
        onClick={() => navigate(staffHomePath())}
      >
        {localize('com_ui_staff_workspace')}
      </Button>
    ) : null;

  const customerViewButton =
    isStaffView ? (
      <Button
        size="sm"
        variant="outline"
        aria-label={localize('com_ui_customer_view')}
        onClick={() => navigate(publicHomePath())}
      >
        {localize('com_ui_customer_view')}
      </Button>
    ) : null;

  const staffLogoutButton =
    isStaffView ? (
      <Button
        size="sm"
        variant="outline"
        aria-label={localize('com_nav_log_out')}
        onClick={() => logout()}
      >
        {localize('com_nav_log_out')}
      </Button>
    ) : null;

  const headerAccountButton = (
    <>
      {staffLoginButton}
      {staffWorkspaceButton}
      {customerViewButton}
      {staffLogoutButton}
    </>
  );

  if (isEmbed) {
    const agentName =
      (conversation?.agent_id != null ? agentsMap?.[conversation.agent_id]?.name : undefined) ??
      conversation?.title ??
      localize('com_ui_chat');

    return (
      <div className="flex h-[52px] w-full shrink-0 items-center gap-2 border-b border-border-light bg-surface-primary px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{agentName}</p>
        </div>
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="via-presentation/70 md:from-presentation/80 md:via-presentation/50 2xl:from-presentation/0 absolute top-0 z-10 flex h-[52px] w-full items-center justify-between bg-gradient-to-b from-presentation to-transparent p-2 font-semibold text-text-primary 2xl:via-transparent">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center">
          {isSmallScreen && isStaffView ? <OpenSidebar /> : null}
          {isPublicChrome && <NewChat showOnMobile />}
          {!(navVisible && isSmallScreen) && (
            <div
              className={cn(
                'flex items-center gap-2 pl-2',
                !isSmallScreen ? 'transition-all duration-200 ease-in-out' : '',
              )}
            >
              {isStaffView && <ModelSelector startupConfig={startupConfig} />}
              {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
              {hasAccessToBookmarks === true && <BookmarkMenu />}
              {hasAccessToMultiConvo === true && <AddMultiConvo />}
              {isSmallScreen && (
                <>
                  <ExportAndShareMenu
                    isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
                  />
                  {hasAccessToTemporaryChat === true && <TemporaryChat />}
                </>
              )}
            </div>
          )}
        </div>

        {!isSmallScreen && (
          <div className="flex items-center gap-2">
            {headerAccountButton}
            <ExportAndShareMenu
              isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
            />
            {hasAccessToTemporaryChat === true && <TemporaryChat />}
          </div>
        )}
        {isSmallScreen ? <div className="flex items-center gap-2">{headerAccountButton}</div> : null}
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}

const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = 'Header';

export default MemoizedHeader;
