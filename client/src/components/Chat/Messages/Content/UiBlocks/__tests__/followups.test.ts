import { ContentTypes } from 'librechat-data-provider';
import type { TMessageContentParts } from 'librechat-data-provider';
import { findFollowUps } from '../followups';

const text = (value: string) => ({ type: ContentTypes.TEXT, text: value }) as TMessageContentParts;
const block = (json: object) => '```hotshot-ui\n' + JSON.stringify(json) + '\n```';
const replies = {
  type: 'quick_replies',
  options: ['Help me choose an anti-gel', 'Explain winter fuel'],
};

describe('findFollowUps', () => {
  it('returns the follow-up block from the answer text', () => {
    const source = findFollowUps([text(`Do this first.\n\n${block(replies)}`)]);
    expect(JSON.parse(source)).toEqual(replies);
  });

  it('ignores other blocks and answers without follow-ups', () => {
    const card = block({ type: 'vehicle_picker', fields: ['year', 'make'] });
    expect(findFollowUps([text(`Tell me your truck.\n\n${card}`)])).toBe('');
    expect(findFollowUps([text('Plain answer.')])).toBe('');
    expect(findFollowUps(undefined)).toBe('');
  });
});
