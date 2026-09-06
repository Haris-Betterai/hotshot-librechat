import { Globe } from 'lucide-react';
import { Spinner } from '@librechat/client';
import { useWatch, useFormContext } from 'react-hook-form';
import {
  SystemRoles,
  Permissions,
  ResourceType,
  PermissionBits,
  PermissionTypes,
} from 'librechat-data-provider';
import type { AgentForm, AgentPanelProps } from '~/common';
import { useLocalize, useAuthContext, useHasAccess, useResourcePermissions } from '~/hooks';
import { GenericGrantAccessDialog } from '~/components/Sharing';
import { useUpdateAgentMutation } from '~/data-provider';
import AdvancedButton from './Advanced/AdvancedButton';
import VersionButton from './Version/VersionButton';
import DuplicateAgent from './DuplicateAgent';
import AdminSettings from './AdminSettings';
import DeleteButton from './DeleteButton';
import EmbedWidget from './embed/Widget';
import { Panel } from '~/common';

export default function AgentFooter({
  activePanel,
  createMutation,
  updateMutation,
  setActivePanel,
  setCurrentAgentId,
  isAvatarUploading = false,
  fullPage = false,
}: Pick<
  AgentPanelProps,
  'setCurrentAgentId' | 'createMutation' | 'activePanel' | 'setActivePanel'
> & {
  updateMutation: ReturnType<typeof useUpdateAgentMutation>;
  isAvatarUploading?: boolean;
  fullPage?: boolean;
}) {
  const localize = useLocalize();
  const { user } = useAuthContext();

  const methods = useFormContext<AgentForm>();

  const { control } = methods;
  const agent = useWatch({ control, name: 'agent' });
  const agent_id = useWatch({ control, name: 'id' });
  const hasAccessToShareAgents = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.SHARE,
  });
  const hasAccessToShareRemoteAgents = useHasAccess({
    permissionType: PermissionTypes.REMOTE_AGENTS,
    permission: Permissions.SHARE,
  });
  const { hasPermission, isLoading: permissionsLoading } = useResourcePermissions(
    ResourceType.AGENT,
    agent?._id || '',
  );
  const { hasPermission: hasRemoteAgentPermission, isLoading: remotePermissionsLoading } =
    useResourcePermissions(ResourceType.REMOTE_AGENT, agent?._id || '');

  const canShareThisAgent = hasPermission(PermissionBits.SHARE);
  const canEditThisAgent = hasPermission(PermissionBits.EDIT);
  const canDeleteThisAgent = hasPermission(PermissionBits.DELETE);
  const canShareRemoteAgent = hasRemoteAgentPermission(PermissionBits.SHARE);
  const isSaving = createMutation.isLoading || updateMutation.isLoading || isAvatarUploading;
  const saveLabel = agent_id ? localize('com_ui_save') : localize('com_ui_create');

  const renderSaveButton = () => (
    <span className="t-icon-swap" data-state={isSaving ? 'b' : 'a'} aria-hidden={false}>
      <span className="t-icon" data-icon="a">
        {saveLabel}
      </span>
      <span className="t-icon" data-icon="b">
        <Spinner className="icon-md" aria-hidden="true" />
      </span>
    </span>
  );

  const showButtons = activePanel === Panel.builder;
  const isOwnerOrAdmin = agent?.author === user?.id || user?.role === SystemRoles.ADMIN;
  const isAdmin = user?.role === SystemRoles.ADMIN;

  const deleteButton = (isOwnerOrAdmin || canDeleteThisAgent) && !permissionsLoading && (
    <DeleteButton
      agent_id={agent_id}
      setCurrentAgentId={setCurrentAgentId}
      createMutation={createMutation}
    />
  );

  const shareButton = (isOwnerOrAdmin || canShareThisAgent) &&
    hasAccessToShareAgents &&
    !permissionsLoading && (
      <GenericGrantAccessDialog
        resourceDbId={agent?._id}
        resourceId={agent_id}
        resourceName={agent?.name ?? ''}
        resourceType={ResourceType.AGENT}
      />
    );

  const remoteShareButton = (isOwnerOrAdmin || canShareRemoteAgent) &&
    hasAccessToShareRemoteAgents &&
    !remotePermissionsLoading &&
    agent?._id && (
      <GenericGrantAccessDialog
        resourceDbId={agent?._id}
        resourceId={agent_id}
        resourceName={agent?.name ?? ''}
        resourceType={ResourceType.REMOTE_AGENT}
      >
        <button
          type="button"
          className="btn btn-neutral border-token-border-light h-9 px-3"
          aria-label={localize('com_ui_share')}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
        </button>
      </GenericGrantAccessDialog>
    );

  const duplicateButton = (isOwnerOrAdmin || canEditThisAgent) && !permissionsLoading && (
    <DuplicateAgent agent_id={agent_id} />
  );

  const saveButton = (
    <button
      className="btn btn-primary focus:shadow-outline flex h-9 w-full items-center justify-center px-4 py-2 font-semibold text-white hover:bg-green-600 focus:border-green-500"
      type="submit"
      disabled={isSaving}
      aria-busy={isSaving}
    >
      {renderSaveButton()}
    </button>
  );

  const embedWidget = isAdmin && !!agent_id && <EmbedWidget agentId={agent_id} />;

  /** Full page has room for a single action row; the sidebar keeps its stacked layout. */
  if (fullPage) {
    return (
      <>
        {embedWidget}
        <div className="sticky bottom-0 z-20 border-t border-border-light bg-surface-primary">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-5 py-3 md:px-8">
            {showButtons && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <AdvancedButton setActivePanel={setActivePanel} />
                </div>
                {!!agent_id && (
                  <div className="w-36">
                    <VersionButton setActivePanel={setActivePanel} />
                  </div>
                )}
                {isAdmin && (
                  <div className="w-44">
                    <AdminSettings />
                  </div>
                )}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {deleteButton}
              {shareButton}
              {remoteShareButton}
              {duplicateButton}
              <div className="w-40">{saveButton}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mb-1 flex w-full flex-col gap-2">
      {showButtons && (
        <div className={`grid gap-2 ${agent_id ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <AdvancedButton setActivePanel={setActivePanel} />
          {!!agent_id && <VersionButton setActivePanel={setActivePanel} />}
        </div>
      )}
      {isAdmin && showButtons && <AdminSettings />}
      {/* Context Button */}
      <div className="flex items-center justify-end gap-2">
        {deleteButton}
        {shareButton}
        {remoteShareButton}
        {duplicateButton}
        {saveButton}
      </div>

      {embedWidget}
    </div>
  );
}
