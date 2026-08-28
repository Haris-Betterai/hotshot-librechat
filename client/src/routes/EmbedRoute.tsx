import { Spinner } from '@librechat/client';

export default function EmbedRoute() {
  return (
    <div className="flex h-screen items-center justify-center" aria-live="polite" role="status">
      <Spinner className="text-text-primary" />
    </div>
  );
}

