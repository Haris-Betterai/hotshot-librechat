import { memo } from 'react';

type EmbedOrbProps = {
  size?: number;
  className?: string;
};

function EmbedOrb({ size = 32, className }: EmbedOrbProps) {
  return (
    <img
      src="assets/hotshot-orb.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
      data-testid="embed-orb"
    />
  );
}

export default memo(EmbedOrb);
