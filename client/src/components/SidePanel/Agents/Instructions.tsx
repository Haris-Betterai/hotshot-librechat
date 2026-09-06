import { useState, useId } from 'react';
import * as Menu from '@ariakit/react/menu';
import { PlusCircle, Maximize2 } from 'lucide-react';
import { specialVariables } from 'librechat-data-provider';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  Button,
  DropdownPopup,
  OGDialog,
  OGDialogClose,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
} from '@librechat/client';
import type { TSpecialVarLabel } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const textareaClass =
  'lc-field flex w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-border-medium focus-visible:ring-2 focus-visible:ring-ring-primary disabled:cursor-not-allowed disabled:opacity-50';

/** Prompts are authored in Markdown, so the editor is monospace and the preview reuses chat rendering. */
const editorClass = 'font-mono text-[13px] leading-relaxed';

const previewClass =
  'markdown prose prose-sm dark:prose-invert w-full max-w-none break-words overflow-y-auto rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-text-primary';

interface VariableOption {
  label: TSpecialVarLabel;
  value: string;
}

const variableOptions: VariableOption[] = Object.keys(specialVariables).map((key) => ({
  label: `com_ui_special_var_${key}` as TSpecialVarLabel,
  value: `{{${key}}}`,
}));

export default function Instructions({ fullPage = false }: { fullPage?: boolean }) {
  const menuId = useId();
  const dialogMenuId = useId();
  const localize = useLocalize();
  const methods = useFormContext<AgentForm>();
  const { control, setValue, getValues } = methods;
  const instructions = useWatch({ control, name: 'instructions' }) ?? '';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDialogMenuOpen, setIsDialogMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDialogPreview, setShowDialogPreview] = useState(false);

  const handleAddVariable = (label: TSpecialVarLabel, value: string) => {
    const currentInstructions = getValues('instructions') || '';
    const spacer = currentInstructions.length > 0 ? '\n' : '';
    const prefix = localize(label);
    setValue('instructions', currentInstructions + spacer + prefix + ': ' + value);
    setIsMenuOpen(false);
    setIsDialogMenuOpen(false);
  };

  const variableItems = variableOptions.map((option) => ({
    label: localize(option.label) || option.label,
    onClick: () => handleAddVariable(option.label, option.value),
  }));

  const editorHeight = fullPage ? 'min-h-[26rem] lg:min-h-[34rem]' : 'min-h-[11rem]';

  const renderToggle = (
    isPreview: boolean,
    setPreview: (next: boolean) => void,
    idSuffix: string,
  ) => (
    <div
      className="inline-flex rounded-lg border border-border-light p-0.5"
      role="group"
      aria-label={localize('com_ui_instructions')}
    >
      {[false, true].map((preview) => (
        <button
          key={String(preview)}
          id={`instructions-${preview ? 'preview' : 'edit'}-${idSuffix}`}
          type="button"
          onClick={() => setPreview(preview)}
          aria-pressed={isPreview === preview}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            isPreview === preview
              ? 'bg-surface-tertiary text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {localize(preview ? 'com_ui_preview' : 'com_ui_edit')}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mb-3 flex flex-col">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label
          className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary"
          htmlFor="instructions"
        >
          {localize('com_ui_instructions')}
        </label>
        <div className="flex items-center gap-1">
          {renderToggle(showPreview, setShowPreview, 'inline')}
          <DropdownPopup
            portal={true}
            mountByState={true}
            unmountOnHide={true}
            preserveTabOrder={true}
            isOpen={isMenuOpen}
            setIsOpen={setIsMenuOpen}
            trigger={
              <Menu.MenuButton
                id="variables-menu-button"
                aria-label={localize('com_ui_variables')}
                title={localize('com_ui_variables')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
              >
                <PlusCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
              </Menu.MenuButton>
            }
            items={variableItems}
            menuId={menuId}
            className="pointer-events-auto z-30"
          />
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            aria-label={localize('com_ui_expand_editor')}
            title={localize('com_ui_expand_editor')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
          >
            <Maximize2 className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
          </button>
        </div>
      </div>
      <Controller
        name="instructions"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <>
            <textarea
              {...field}
              value={field.value ?? ''}
              className={cn(
                textareaClass,
                editorClass,
                editorHeight,
                'resize-y',
                showPreview && 'hidden',
              )}
              id="instructions"
              placeholder={localize('com_agents_instructions_placeholder')}
              aria-label={localize('com_ui_instructions')}
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            />
            {showPreview && (
              <div className={cn(previewClass, editorHeight)}>
                <MarkdownLite content={field.value ?? ''} codeExecution={false} />
              </div>
            )}
            {error && (
              <span
                className="mt-1 text-xs text-red-500 transition duration-300 ease-in-out"
                role="alert"
              >
                {localize('com_ui_field_required')}
              </span>
            )}
          </>
        )}
      />
      <span className="mt-1 text-right text-[11px] text-text-secondary">
        {localize('com_ui_instructions_characters', { count: instructions.length })}
      </span>

      <OGDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <OGDialogContent
          className="flex h-[85vh] max-h-[85vh] w-11/12 max-w-6xl flex-col gap-4 p-6"
          showCloseButton={false}
        >
          <OGDialogHeader className="mb-2 pr-14">
            <OGDialogTitle className="text-left text-2xl font-semibold">
              {localize('com_ui_instructions')}
            </OGDialogTitle>
          </OGDialogHeader>
          {renderToggle(showDialogPreview, setShowDialogPreview, 'dialog')}
          <Controller
            name="instructions"
            control={control}
            render={({ field }) =>
              showDialogPreview ? (
                <div className={cn(previewClass, 'min-h-0 flex-1')}>
                  <MarkdownLite content={field.value ?? ''} codeExecution={false} />
                </div>
              ) : (
                <textarea
                  {...field}
                  value={field.value ?? ''}
                  className={cn(textareaClass, editorClass, 'min-h-0 flex-1 resize-none')}
                  placeholder={localize('com_agents_instructions_placeholder')}
                  aria-label={localize('com_ui_instructions')}
                />
              )
            }
          />
          <div className="flex items-center justify-between">
            <DropdownPopup
              portal={true}
              mountByState={true}
              unmountOnHide={true}
              preserveTabOrder={true}
              isOpen={isDialogMenuOpen}
              setIsOpen={setIsDialogMenuOpen}
              trigger={
                <Menu.MenuButton
                  id="variables-menu-button-dialog"
                  render={
                    <Button variant="outline" className="gap-1.5">
                      <PlusCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden={true} />
                      {localize('com_ui_variables')}
                    </Button>
                  }
                />
              }
              items={variableItems}
              menuId={dialogMenuId}
              className="pointer-events-auto z-[200]"
            />
            <span className="text-xs text-text-secondary">
              {localize('com_ui_instructions_characters', { count: instructions.length })}
            </span>
            <OGDialogClose asChild>
              <Button>{localize('com_ui_done')}</Button>
            </OGDialogClose>
          </div>
        </OGDialogContent>
      </OGDialog>
    </div>
  );
}
