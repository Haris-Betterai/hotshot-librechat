import { memo } from 'react';
import StatusLine from './Status';

/** Placeholder before any content arrives: the same calm status line, in its "thinking" state. */
const EmptyTextPart = memo(() => {
  return <StatusLine content={undefined} isSubmitting={true} />;
});

export default EmptyTextPart;
