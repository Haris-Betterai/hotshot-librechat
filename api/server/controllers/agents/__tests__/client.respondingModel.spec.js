const AgentClient = require('../client');

/** `buildResponseMetadata` is called with `this` bound to a plain object, matching
 *  how `client.contextMetadata.spec.js` exercises the same method — no snapshot/
 *  usage data needed here since `respondingModel` doesn't depend on either. */
function buildMeta({ model } = {}) {
  const self = {
    model,
    collectedThoughtSignatures: null,
    usageEmitSink: [],
    contextUsageSink: { latest: null, count: 0 },
  };
  return AgentClient.prototype.buildResponseMetadata.call(self);
}

describe('AgentClient.buildResponseMetadata — respondingModel', () => {
  it('persists the resolved model, distinct from the agent id stored on message.model', () => {
    const meta = buildMeta({ model: 'gpt-5.6-luna' });
    expect(meta.respondingModel).toBe('gpt-5.6-luna');
  });

  it('reflects whichever model actually answered this turn (e.g. a Deepest-tier run)', () => {
    const meta = buildMeta({ model: 'gpt-5.6' });
    expect(meta.respondingModel).toBe('gpt-5.6');
  });

  it('omits the field when no model was resolved', () => {
    const meta = buildMeta({ model: undefined });
    expect(meta).toBeUndefined();
  });

  it('omits the field for a non-string model value rather than persisting garbage', () => {
    const meta = buildMeta({ model: 42 });
    expect(meta).toBeUndefined();
  });

  it('omits the field for an empty string rather than persisting a blank badge', () => {
    const meta = buildMeta({ model: '' });
    expect(meta).toBeUndefined();
  });
});
