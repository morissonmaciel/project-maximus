import Bunnix from '@bunnix/core';
import './Button.css';

const { button } = Bunnix;

/**
 * Button component - pill-style button
 * @param {Object} props
 * @param {string} [props.variant='primary'] - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {Function} [props.click]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {any} children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  click,
  disabled = false,
  className = '',
  ...props
}, children) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const fullClass = `btn ${variantClass} ${sizeClass} ${className}`.trim();

  return button({
    class: fullClass,
    click,
    disabled,
    ...props
  }, children);
}
