import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AgentForm } from '~/common';
import Levels from './Levels';

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('librechat-data-provider/react-query', () => ({
  useGetModelsQuery: () => ({ data: { openAI: ['gpt-5.6-sol'] } }),
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
