/* eslint-disable */
import React, { useState } from "react";
import { FiEdit2, FiSave, FiTrash2, FiX } from "react-icons/fi";
import "../../STYLES/traveller.css";

const TravelerTable = ({ data, onUpdate, onDelete }) => {
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditData({ ...row });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEditData({ ...editData, [name]: value });
  };

  const handleSave = () => {
    onUpdate(editId, editData);
    setEditId(null);
  };

  return (
    <div className="table-wrapper">
      <table className="traveler-table">
        <thead>
          <tr>
            <th>Sr</th>
            <th>Name</th>
            <th>Type</th>
            <th>Gender</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="5" className="table-empty">
                No Data Found
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const isEdit = editId === item.id;
              return (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    {isEdit ? (
                      <input
                        name="name"
                        value={editData.name}
                        onChange={handleChange}
                        className="input-field"
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                      <td>{item.type || "Adult"}</td>
                  <td>
                    {isEdit ? (
                      <select
                        name="gender"
                        value={editData.gender}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    ) : (
                      item.gender
                    )}
                  </td>
                  <td>
                    {!isEdit ? (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="icon-btn icon-edit"
                          type="button"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="icon-btn icon-delete"
                          type="button"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSave}
                          className="icon-btn icon-save"
                          type="button"
                          title="Save"
                        >
                          <FiSave />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="icon-btn icon-cancel"
                          type="button"
                          title="Cancel"
                        >
                          <FiX />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TravelerTable;
