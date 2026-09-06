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
  expect(screen.getAllByRole('combobox', { name: /com_ui_intelligence_effort/ })).toHaveLength(5);
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
});
