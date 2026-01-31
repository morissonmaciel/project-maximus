import Bunnix from '@bunnix/core';
import './ProgressBar.css';

const { div, span } = Bunnix;

/**
 * ProgressBar component - progress indicator
 * @param {Object} props
 * @param {number} props.progress - progress value 0-100
 * @param {string} [props.variant='default'] - 'default' | 'success'
 * @param {string} [props.size='default'] - 'default' | 'lg'
 * @param {string} [props.label] - optional label text
 * @param {string} [props.className]
 */
export function ProgressBar({
  progress = 0,
  variant = 'default',
  size = 'default',
  label,
  className = '',
  ...props
}) {
  const variantClass = variant === 'success' ? 'progress-bar-success' : '';
  const sizeClass = size === 'lg' ? 'progress-bar-lg' : '';
  const hasLabel = label ? 'progress-bar-with-label' : '';
  const fullClass = `progress-bar ${variantClass} ${sizeClass} ${hasLabel} ${className}`.trim();

  const clampedProgress = Math.max(0, Math.min(100, progress));

  if (label) {
    return div({ class: fullClass, ...props },
      div({ class: 'progress-bar-label' },
        span({}, label),
        span({}, `${Math.round(clampedProgress)}%`)
      ),
      div({ class: 'progress-bar' },
        div({
          class: 'progress-bar-fill',
          style: `width: ${clampedProgress}%`
        })
      )
    );
  }

  return div({ class: fullClass, ...props },
    div({
      class: 'progress-bar-fill',
      style: `width: ${clampedProgress}%`
    })
  );
}
