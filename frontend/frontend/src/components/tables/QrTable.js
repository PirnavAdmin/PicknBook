/* eslint-disable */
import React from "react";
import QRRow from "./QrRow";
import "../../STYLES/QR.css";

const QRTable = ({
  data,
  onQRClick,
  editingId,
  setEditingId,
  onUpdate,
  onDelete,
  isLoading,
  busyId,
}) => {
  return (
    <div className="table-wrapper">
      <table className="qr-table">
        <thead>
          <tr>
            <th>Sr</th>
            <th>Bank</th>
            <th>Account</th>
            <th>UPI</th>
            <th>Mobile</th>
            <th>QR</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="7">Loading QR details...</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan="7">No QR records found</td>
            </tr>
          ) : (
            data.map((item, index) => (
              <QRRow
                key={item.id}
                item={item}
                index={index}
                onQRClick={onQRClick}
                isEditing={editingId === item.id}
                setEditingId={setEditingId}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isBusy={busyId === item.id || busyId === "create"}
                busyId={busyId}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default QRTable;
