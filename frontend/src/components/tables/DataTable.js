/* eslint-disable */
import React from 'react';

const DataTable = ({ headers, legend, data = [] }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        borderRadius: '6px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {legend && (
        <div
          style={{
            padding: '8px',
            fontSize: '9px',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #f3f4f6',
            fontStyle: 'italic',
          }}
        >
          <strong>Legend:</strong> {legend}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            textAlign: 'left',
            borderCollapse: 'collapse',
          }}
        >
          <thead
            style={{
              backgroundColor: '#1d63bf',
              color: '#ffffff',
              fontSize: '10.8px',
              textTransform: 'uppercase',
            }}
          >
            <tr>
              {headers.map((h, index) => (
                <th
                  key={index}
                  style={{
                    padding: '8px',
                    border: '1px solid #78a8e8',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            style={{
              fontSize: '11.7px',
              color: '#374151',
            }}
          >
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  {Object.values(row).map((value, colIndex) => (
                    <td
                      key={colIndex}
                      style={{
                        padding: '8px',
                        borderRight:
                          colIndex !== Object.values(row).length - 1
                            ? '1px solid #f3f4f6'
                            : 'none',
                      }}
                    >
                      {/* Status Badge Styling */}
                      {typeof value === 'string' &&
                      ['Confirmed', 'Approved', 'Processed'].includes(value) ? (
                        <span
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '9.9px',
                            fontWeight: '500',
                          }}
                        >
                          {value}
                        </span>
                      ) : typeof value === 'string' &&
                        ['Pending'].includes(value) ? (
                        <span
                          style={{
                            backgroundColor: '#fef9c3',
                            color: '#a16207',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '9.9px',
                            fontWeight: '500',
                          }}
                        >
                          {value}
                        </span>
                      ) : typeof value === 'string' &&
                        ['Fail', 'Cancelled'].includes(value) ? (
                        <span
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '9.9px',
                            fontWeight: '500',
                          }}
                        >
                          {value}
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}

                  {/* Optional Action Column */}
                  <td style={{ padding: '8px' }}>
                    {/* Example Button */}
                    {/* <button style={{ color: '#2563eb', fontWeight: '500', cursor: 'pointer', border: 'none', background: 'none' }}>
                      View
                    </button> */}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12.6px',
                  }}
                >
                  No Record Found...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;

