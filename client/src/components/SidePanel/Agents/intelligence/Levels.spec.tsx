import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { AgentForm } from '~/common';
import Levels from './Levels';

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('librechat-data-provider/react-query', () => ({
  useGetModelsQuery: () => ({
    data: {
      openAI: [
        'gpt-5.6-sol',
        'gpt-6-astra',
        'gpt-6-luna',
        'gpt-5.6',
        'gpt-3.5-turbo-instruct',
        'gpt-4o',
      ],
    },
  }),
}));

it('submits the selected effort and preserves it while editing a label', async () => {
  const onSubmit = jest.fn();
  function Form() {
    const form = useForm<AgentForm>({
      defaultValues: {
        provider: 'openAI',
        intelligence: {
          levels: [{ label: 'Research', model: 'gpt-5.6-sol', reasoning_effort: 'low' }],
        },
      },
    });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Levels />
          <button type="submit">{'Save'}</button>
        </form>
      </FormProvider>
    );
  }
  render(<Form />);
  expect(screen.getAllByRole('combobox', { name: /com_ui_intelligence_effort/ })).toHaveLength(1);
  fireEvent.change(screen.getByRole('combobox', { name: 'com_ui_intelligence_effort 1' }), {
    target: { value: 'max' },
  });
  fireEvent.change(screen.getAllByPlaceholderText('com_ui_intelligence_label_placeholder')[0], {
    target: { value: 'Deep research' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].intelligence.levels[0]).toEqual({
    label: 'Deep research',
    model: 'gpt-5.6-sol',
    reasoning_effort: 'max',
  });
  expect(onSubmit.mock.calls[0][0].intelligence.default_level).toBe('Deep research');
});

it('adds a level and lets staff choose it as the default', async () => {
  const onSubmit = jest.fn();
  function Form() {
    const form = useForm<AgentForm>({
      defaultValues: {
        provider: 'openAI',
        intelligence: {
          levels: [
            { label: 'Balanced', model: 'gpt-5.6-sol', reasoning_effort: 'low' },
            { label: 'Deep', model: 'gpt-5.6-sol', reasoning_effort: 'high' },
          ],
        },
      },
    });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Levels />
          <button type="submit">{'Save'}</button>
        </form>
      </FormProvider>
    );
  }
  render(<Form />);
  fireEvent.click(screen.getByRole('button', { name: /com_ui_intelligence_add_level/ }));
  expect(screen.getAllByRole('combobox', { name: /com_ui_intelligence_effort/ })).toHaveLength(3);
  fireEvent.change(screen.getAllByPlaceholderText('com_ui_intelligence_label_placeholder')[2], {
    target: { value: 'Experimental' },
  });
  fireEvent.change(screen.getAllByRole('combobox', { name: 'com_ui_model' })[2], {
    target: { value: 'gpt-5.6-sol' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'com_ui_intelligence_default_level' }), {
    target: { value: 'Experimental' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].intelligence.levels).toHaveLength(3);
  expect(onSubmit.mock.calls[0][0].intelligence.default_level).toBe('Experimental');
});

it('chooses a valid fallback when the explicit default level is removed', async () => {
  const onSubmit = jest.fn();
  function Form() {
    const form = useForm<AgentForm>({
      defaultValues: {
        provider: 'openAI',
        intelligence: {
          levels: [
            { label: 'Balanced', model: 'gpt-5.6-sol' },
            { label: 'Deep', model: 'gpt-5.6-sol' },
          ],
          default_level: 'Deep',
        },
      },
    });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Levels />
          <button type="submit">{'Save'}</button>
        </form>
      </FormProvider>
    );
  }
  render(<Form />);
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_intelligence_remove_level 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].intelligence.levels).toEqual([
    { label: 'Balanced', model: 'gpt-5.6-sol' },
  ]);
  expect(onSubmit.mock.calls[0][0].intelligence.default_level).toBe('Balanced');
});

const legacyLevels = [
  { label: 'Fast', model: 'gpt-5.6-luna' },
  { label: 'Smart', model: 'gpt-5.6-terra' },
  { label: 'Smarter', model: 'gpt-5.6' },
];

function renderForm(
  intelligence: NonNullable<AgentForm['intelligence']>,
  onSubmit: jest.Mock = jest.fn(),
) {
  function Form() {
    const form = useForm<AgentForm>({
      defaultValues: { provider: 'openAI', intelligence },
    });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Levels />
          <button type="submit">{'Save'}</button>
        </form>
      </FormProvider>
    );
  }
  render(<Form />);
  return onSubmit;
}

const submit = async (onSubmit: jest.Mock) => {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0].intelligence;
};

it('falls back to the preset purpose and prefers an explicit description', () => {
  renderForm({
    levels: [
      { ...legacyLevels[0], description: 'Ships the quick answer.' },
      ...legacyLevels.slice(1),
    ],
  });
  expect(screen.getByText('Ships the quick answer.')).toBeInTheDocument();
  expect(screen.queryByText('com_ui_intelligence_fast_purpose')).not.toBeInTheDocument();
  expect(screen.getByText('com_ui_intelligence_balanced_purpose')).toBeInTheDocument();
  expect(screen.getByText('com_ui_intelligence_deepest_purpose')).toBeInTheDocument();
});

it('saves a description and clears it back to undefined', async () => {
  const onSubmit = renderForm({ levels: [{ label: 'Deep', model: 'gpt-5.6-sol' }] });
  const description = screen.getByLabelText('com_ui_intelligence_description_placeholder 1');
  fireEvent.change(description, { target: { value: 'Long troubleshooting threads.' } });
  expect((await submit(onSubmit)).levels[0].description).toBe('Long troubleshooting threads.');
  fireEvent.change(description, { target: { value: '' } });
  expect((await submit(onSubmit)).levels[0].description).toBeUndefined();
});

it('round-trips the advanced instructions and tool step limit', async () => {
  const onSubmit = renderForm({ levels: [{ label: 'Deep', model: 'gpt-5.6-sol' }] });
  const instructions = screen.getByLabelText('com_ui_intelligence_instructions_placeholder 1');
  const limit = screen.getByLabelText('com_ui_intelligence_recursion_limit 1');
  fireEvent.change(instructions, { target: { value: 'Always cite the capacity chart.' } });
  fireEvent.change(limit, { target: { value: '12' } });
  const saved = await submit(onSubmit);
  expect(saved.levels[0]).toEqual({
    label: 'Deep',
    model: 'gpt-5.6-sol',
    instructions: 'Always cite the capacity chart.',
    recursion_limit: 12,
  });
  fireEvent.change(instructions, { target: { value: '' } });
  fireEvent.change(limit, { target: { value: '' } });
  const cleared = await submit(onSubmit);
  expect(cleared.levels[0].instructions).toBeUndefined();
  expect(cleared.levels[0].recursion_limit).toBeUndefined();
});

it('seeds Auto from the current default and the last level, then makes Auto the default', async () => {
  const onSubmit = renderForm({
    levels: [
      { label: 'Balanced', model: 'gpt-5.6-sol' },
      { label: 'Deep', model: 'gpt-5.6-sol' },
    ],
    default_level: 'Balanced',
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'com_ui_intelligence_auto_enable' }));
  const saved = await submit(onSubmit);
  expect(saved.auto).toEqual({
    label: 'com_ui_intelligence_auto',
    base: 'Balanced',
    escalate: 'Deep',
  });
  expect(saved.default_level).toBe('com_ui_intelligence_auto');
});

it('seeds Auto away from the cheapest level even when the default is the top of the ladder', async () => {
  const onSubmit = renderForm({
    levels: [
      { label: 'Fast', model: 'gpt-5.6-sol' },
      { label: 'Balanced', model: 'gpt-5.6-sol' },
      { label: 'Deep', model: 'gpt-5.6-sol' },
    ],
    default_level: 'Deep',
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'com_ui_intelligence_auto_enable' }));
  expect((await submit(onSubmit)).auto).toEqual({
    label: 'com_ui_intelligence_auto',
    base: 'Balanced',
    escalate: 'Deep',
  });
});

it('lists Auto in the default level select and keeps it selected', () => {
  renderForm({
    levels: [
      { label: 'Balanced', model: 'gpt-5.6-sol' },
      { label: 'Deep', model: 'gpt-5.6-sol' },
    ],
    default_level: 'Auto',
    auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
  });
  const select = screen.getByRole('combobox', { name: 'com_ui_intelligence_default_level' });
  expect(within(select).getByRole('option', { name: 'Auto' })).toBeInTheDocument();
  expect((select as HTMLSelectElement).value).toBe('Auto');
});

it('edits the Auto routing fields and follows an Auto rename in the default level', async () => {
  const onSubmit = renderForm({
    levels: [
      { label: 'Balanced', model: 'gpt-5.6-sol' },
      { label: 'Deep', model: 'gpt-5.6-sol' },
    ],
    default_level: 'Auto',
    auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'com_ui_intelligence_auto_base' }), {
    target: { value: 'Deep' },
  });
  fireEvent.change(screen.getByLabelText('com_ui_intelligence_auto_triggers'), {
    target: { value: ' dpf , top off ,, ' },
  });
  fireEvent.change(screen.getByLabelText('com_ui_intelligence_auto_description_placeholder'), {
    target: { value: 'Routes each question for you.' },
  });
  fireEvent.change(screen.getByLabelText('com_ui_intelligence_auto_label'), {
    target: { value: 'Smart routing' },
  });
  const saved = await submit(onSubmit);
  expect(saved.auto).toEqual({
    label: 'Smart routing',
    base: 'Deep',
    escalate: 'Deep',
    triggers: ['dpf', 'top off'],
    description: 'Routes each question for you.',
  });
  expect(saved.default_level).toBe('Smart routing');
});

it('restores a real default level when Auto is turned off', async () => {
  const onSubmit = renderForm({
    levels: [
      { label: 'Balanced', model: 'gpt-5.6-sol' },
      { label: 'Deep', model: 'gpt-5.6-sol' },
    ],
    default_level: 'Auto',
    auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'com_ui_intelligence_auto_enable' }));
  const saved = await submit(onSubmit);
  expect(saved.auto).toBeUndefined();
  expect(saved.default_level).toBe('Balanced');
});

it('renames the levels Auto points at and drops Auto below two levels', async () => {
  const onSubmit = renderForm({
    levels: [
      { label: 'Balanced', model: 'gpt-5.6-sol' },
      { label: 'Deep', model: 'gpt-5.6-sol' },
    ],
    default_level: 'Auto',
    auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
  });
  fireEvent.change(screen.getAllByPlaceholderText('com_ui_intelligence_label_placeholder')[1], {
    target: { value: 'Deepest' },
  });
  expect((await submit(onSubmit)).auto).toEqual({
    label: 'Auto',
    base: 'Balanced',
    escalate: 'Deepest',
  });
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_intelligence_remove_level 2' }));
  const saved = await submit(onSubmit);
  expect(saved.auto).toBeUndefined();
  expect(saved.default_level).toBe('Balanced');
});

function renderLevel(level: { model: string; reasoning_effort?: 'none' | 'low' | 'high' }) {
  const onSubmit = jest.fn();
  function Form() {
    const form = useForm<AgentForm>({
      defaultValues: {
        provider: 'openAI',
        intelligence: { levels: [{ label: 'Research', ...level }] },
      },
    });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Levels />
          <button type="submit">{'Save'}</button>
        </form>
      </FormProvider>
    );
  }
  render(<Form />);
  return onSubmit;
}

it('lists current models first and hides obsolete ones', () => {
  renderLevel({ model: 'gpt-6-astra' });
  const model = screen.getByRole('combobox', { name: 'com_ui_model' });
  const values = within(model)
    .getAllByRole('option')
    .map((option) => option.getAttribute('value'));
  expect(values).toEqual(['', 'gpt-6-astra', 'gpt-6-luna', 'gpt-5.6-sol', 'gpt-5.6', 'gpt-4o']);
});

it('keeps a saved obsolete model visible and selected', () => {
  renderLevel({ model: 'gpt-3.5-turbo-instruct' });
  const model = screen.getByRole('combobox', { name: 'com_ui_model' }) as HTMLSelectElement;
  expect(model.value).toBe('gpt-3.5-turbo-instruct');
});

it('offers no None effort for gpt-6-astra and resets it when switching to such a model', async () => {
  const onSubmit = renderLevel({ model: 'gpt-6-luna', reasoning_effort: 'none' });
  const effort = screen.getByRole('combobox', { name: 'com_ui_intelligence_effort 1' });
  expect(within(effort).queryByRole('option', { name: 'com_ui_none' })).not.toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'com_ui_model' }), {
    target: { value: 'gpt-6-astra' },
  });
  expect(within(effort).queryByRole('option', { name: 'com_ui_none' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].intelligence.levels[0].reasoning_effort).toBe('low');
});
