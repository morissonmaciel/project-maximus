import Bunnix from '@bunnix/core';
import './Card.css';

const { div } = Bunnix;

/**
 * Card component - container with border and rounded corners
 * @param {Object} props
 * @param {string} [props.variant='default'] - 'default' | 'hover' | 'interactive'
 * @param {string} [props.size='default'] - 'default' | 'compact'
 * @param {boolean} [props.active] - for interactive variant
 * @param {boolean} [props.disabled] - for interactive variant
 * @param {Function} [props.click]
 * @param {string} [props.className]
 * @param {any} [props.header] - header content
 * @param {any} [props.footer] - footer content
 * @param {any} children
 */
export function Card({
  variant = 'default',
  size = 'default',
  active = false,
  disabled = false,
  click,
  className = '',
  header,
  footer,
  children,
  ...props
}) {
  const variantClass = variant === 'hover' ? 'card-hover' :
                       variant === 'interactive' ? 'card-interactive' : '';
  const sizeClass = size === 'compact' ? 'card-compact' : '';
  const activeClass = active ? 'active' : '';
  const disabledClass = disabled ? 'disabled' : '';
  const fullClass = `card ${variantClass} ${sizeClass} ${activeClass} ${disabledClass} ${className}`.trim();

  return div({
    class: fullClass,
    click,
    ...props
  },
    header ? div({ class: 'card-header' }, header) : null,
    children,
    footer ? div({ class: 'card-footer' }, footer) : null
  );
}
