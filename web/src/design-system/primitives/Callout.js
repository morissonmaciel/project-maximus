import Bunnix from '@bunnix/core';
import './Callout.css';

const { div } = Bunnix;

/**
 * Callout component - info/alert box
 * @param {Object} props
 * @param {string} [props.variant='default'] - 'default' | 'info' | 'success' | 'warning' | 'error'
 * @param {string} [props.icon] - emoji/icon character
 * @param {string} [props.title]
 * @param {string} [props.className]
 * @param {any} children
 */
export function Callout({
  variant = 'default',
  icon,
  title,
  className = '',
  children,
  ...props
}) {
  const variantClass = variant !== 'default' ? `callout-${variant}` : '';
  const fullClass = `callout ${variantClass} ${className}`.trim();

  const defaultIcons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✗'
  };

  const iconChar = icon || defaultIcons[variant] || null;

  return div({ class: fullClass, ...props },
    iconChar ? div({ class: 'callout-icon' }, iconChar) : null,
    div({ class: 'callout-content' },
      title ? div({ class: 'callout-title' }, title) : null,
      div({ class: 'callout-text' }, children)
    )
  );
}
