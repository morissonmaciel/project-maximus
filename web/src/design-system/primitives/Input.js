import Bunnix from '@bunnix/core';
import './Input.css';

const { input, select, option } = Bunnix;

/**
 * Input component - text input field
 * @param {Object} props
 * @param {string} [props.variant='filled'] - 'filled' | 'bordered'
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {string} [props.type='text']
 * @param {string} [props.placeholder]
 * @param {string|import('@bunnix/core').State} [props.value]
 * @param {Function} [props.input]
 * @param {Function} [props.keydown]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export function Input({
  variant = 'filled',
  size = 'md',
  type = 'text',
  placeholder,
  value,
  input: onInput,
  keydown: onKeydown,
  disabled = false,
  className = '',
  ...props
}) {
  const variantClass = variant === 'bordered' ? 'input-bordered' : '';
  const sizeClass = size !== 'md' ? `input-${size}` : '';
  const fullClass = `input ${variantClass} ${sizeClass} ${className}`.trim();

  return input({
    class: fullClass,
    type,
    placeholder,
    value,
    input: onInput,
    keydown: onKeydown,
    disabled,
    ...props
  });
}

/**
 * Select component - dropdown select
 * @param {Object} props
 * @param {string} [props.size='md']
 * @param {string} [props.value]
 * @param {Function} [props.change]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {any} children - option elements
 */
export function Select({
  size = 'md',
  value,
  change,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const sizeClass = size !== 'md' ? `input-${size}` : '';
  const fullClass = `input select ${sizeClass} ${className}`.trim();

  return select({
    class: fullClass,
    value,
    change,
    disabled,
    ...props
  }, children);
}

/**
 * Option component for Select
 * @param {Object} props
 * @param {string} props.value
 * @param {boolean} [props.selected]
 * @param {any} children
 */
export function Option({ value, selected = false, children }) {
  return option({ value, selected }, children);
}
