import Bunnix from '@bunnix/core';
import './Sidebar.css';

const { div, button, span } = Bunnix;

/**
 * Sidebar component - navigation sidebar for SettingsModal
 * @param {Object} props
 * @param {Array<{id: string, label: string, section?: string}>} props.items
 * @param {string|import('@bunnix/core').State} props.activeItem
 * @param {Function} props.onSelect
 * @param {string} [props.className]
 */
export function Sidebar({ items, activeItem, onSelect, className = '' }) {
  // Group items by section
  const groupedItems = items.reduce((acc, item) => {
    const section = item.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const sections = Object.keys(groupedItems);

  return div({ class: `sidebar ${className}`.trim() },
    ...sections.flatMap((section, index) => {
      const sectionItems = groupedItems[section];
      const elements = [];

      if (section !== 'General') {
        elements.push(
          div({ class: 'sidebar-section-title' }, section)
        );
      }

      sectionItems.forEach(item => {
        const isActive = typeof activeItem === 'object' && activeItem.get
          ? activeItem.map(a => a === item.id)
          : activeItem === item.id;

        elements.push(
          button({
            class: Bunnix.Compute(
              typeof isActive === 'object' ? isActive : Bunnix.useState(isActive),
              active => `sidebar-item ${active ? 'active' : ''}`
            ),
            click: () => onSelect(item.id)
          }, item.label)
        );
      });

      if (index < sections.length - 1) {
        elements.push(div({ class: 'sidebar-divider' }));
      }

      return elements;
    })
  );
}

/**
 * Simple sidebar with flat item list
 * @param {Object} props
 * @param {Array<{id: string, label: string}>} props.items
 * @param {string} props.activeItem
 * @param {Function} props.onSelect
 */
export function SimpleSidebar({ items, activeItem, onSelect }) {
  return div({ class: 'sidebar' },
    ...items.map(item => {
      const isActive = typeof activeItem === 'object' && activeItem.get
        ? activeItem.map(a => a === item.id)
        : Bunnix.useState(activeItem === item.id);

      return button({
        class: Bunnix.Compute(isActive, active => `sidebar-item ${active ? 'active' : ''}`),
        click: () => onSelect(item.id)
      }, item.label);
    })
  );
}
