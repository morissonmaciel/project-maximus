import Bunnix, { ForEach } from '@bunnix/core';
import './Table.css';

const { div, table, thead, tbody, tr, th, td } = Bunnix;

/**
 * Table component - data table with header and rows
 * @param {Object} props
 * @param {Array<{key: string, label: string}>} props.columns - column definitions
 * @param {Array<Object>} props.data - row data
 * @param {string} [props.size='default'] - 'default' | 'compact'
 * @param {string} [props.className]
 * @param {Function} [props.renderCell] - custom cell renderer (column, row) => any
 */
export function Table({
  columns,
  data,
  size = 'default',
  className = '',
  renderCell,
  ...props
}) {
  const sizeClass = size === 'compact' ? 'table-compact' : '';
  const fullClass = `table-container ${sizeClass} ${className}`.trim();

  const defaultRenderCell = (column, row) => {
    return td({}, row[column.key] ?? '');
  };

  const cellRenderer = renderCell || defaultRenderCell;

  return div({ class: fullClass, ...props },
    table({ class: 'table' },
      thead({},
        tr({},
          ...columns.map(col => th({}, col.label))
        )
      ),
      tbody({},
        ForEach(data, 'key', (row) =>
          tr({},
            ...columns.map(col => cellRenderer(col, row))
          )
        )
      )
    )
  );
}

/**
 * Simple list table (no header, single column)
 * @param {Object} props
 * @param {Array<Object>} props.data
 * @param {string} props.keyField - field to use as key
 * @param {Function} props.renderRow - (item) => any
 * @param {string} [props.className]
 */
export function ListTable({
  data,
  keyField,
  renderRow,
  className = '',
  ...props
}) {
  return div({ class: `table-container table-list ${className}`.trim(), ...props },
    table({ class: 'table table-compact' },
      tbody({},
        ForEach(data, keyField, (row) =>
          tr({}, td({}, renderRow(row)))
        )
      )
    )
  );
}
