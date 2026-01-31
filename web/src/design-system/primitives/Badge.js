import Bunnix from '@bunnix/core';
import './Badge.css';

const { span } = Bunnix;

/**
 * Badge component - status indicator/label
 * @param {Object} props
 * @param {string} [props.variant='neutral'] - 'success' | 'warning' | 'error' | 'neutral' | 'subtle'
 * @param {boolean} [props.dot=false] - show dot indicator
 * @param {string} [props.className]
 * @param {any} children
 */
export function Badge({
  variant = 'neutral',
  dot = false,
  className = '',
  children,
  ...props
}) {
  const variantClass = `badge-${variant}`;
  const dotClass = dot ? 'badge-dot' : '';
  const fullClass = `badge ${variantClass} ${dotClass} ${className}`.trim();

  return span({ class: fullClass, ...props }, children);
}
