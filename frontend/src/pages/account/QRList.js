/* eslint-disable */
import React, { useCallback, useEffect, useRef, useState } from "react";
import QRTable from "../../components/tables/QrTable";
import {
  deleteBankUpiDetail,
  fetchBankUpiQrBlob,
  listBankUpiDetails,
  updateBankUpiDetail,
  uploadBankUpiQr,
} from "../../services/bankDetailsService";
import "../../STYLES/QR.css";

function formatApiError(error, fallback) {
  const message = String(error?.message || "").trim();
  if (!message) {
    return fallback;
  }

  return message.replace(/^"|"$/g, "");
}

function buildGeneratedQr(upiId) {
  const source = String(upiId || "").trim();
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    source || "upi"
  )}`;
}

const QRList = () => {
  const [data, setData] = useState([]);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const blobUrlSetRef = useRef(new Set());

  const clearBlobUrls = useCallback(() => {
    blobUrlSetRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore failed revocation.
      }
    });

    blobUrlSetRef.current.clear();
  }, []);

  const loadQrRecords = useCallback(async () => {
    setIsLoading(true);

    try {
      const records = await listBankUpiDetails();
      const nextBlobUrlSet = new Set();

      const mapped = await Promise.all(
        records.map(async (record) => {
          let qrImage = "";

          if (record.hasQrImage) {
            try {
              const blob = await fetchBankUpiQrBlob(record.id);
              qrImage = URL.createObjectURL(blob);
              nextBlobUrlSet.add(qrImage);
            } catch {
              qrImage = "";
            }
          } else if (record.qrImageUrl) {
            qrImage = record.qrImageUrl;
          }

          return {
            id: record.id,
            bankName: record.bankName,
            accountName: record.accountHolderName,
            upiId: record.upiId,
            mobile: record.mobile,
            qrImage: qrImage || buildGeneratedQr(record.upiId),
            hasQrImage: record.hasQrImage,
          };
        })
      );

      clearBlobUrls();
      blobUrlSetRef.current = nextBlobUrlSet;
      setData(mapped);
      setFeedback((previous) =>
        previous.type === "error" ? { type: "", message: "" } : previous
      );
    } catch (error) {
      clearBlobUrls();
      setData([]);
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to load QR details."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [clearBlobUrls]);

  useEffect(() => {
    loadQrRecords();
  }, [loadQrRecords]);

  useEffect(() => () => clearBlobUrls(), [clearBlobUrls]);

  const handleUpdate = async (updatedRow) => {
    setBusyId(updatedRow.id);

    try {
      await updateBankUpiDetail(updatedRow.id, {
        bankName: String(updatedRow.bankName || "").trim(),
        accountHolderName: String(updatedRow.accountName || "").trim(),
        upiId: String(updatedRow.upiId || "").trim(),
        mobile: String(updatedRow.mobile || "").trim(),
      });

      if (updatedRow.file) {
        await uploadBankUpiQr(updatedRow.id, updatedRow.file);
      }

      await loadQrRecords();
      setEditingId(null);
      setFeedback({ type: "success", message: "QR detail updated successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to update QR detail."),
      });
      throw error;
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this QR detail?")) {
      return;
    }

    setBusyId(id);

    try {
      await deleteBankUpiDetail(id);
      await loadQrRecords();
      setFeedback({ type: "success", message: "QR detail deleted successfully." });

      if (selectedQR?.id === id) {
        setSelectedQR(null);
      }

      if (editingId === id) {
        setEditingId(null);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to delete QR detail."),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="qr-container">
      <div className="flex-header">
        <h2 className="title-main">QR List</h2>
      </div>

      {feedback.message && (
        <div className={`qr-feedback ${feedback.type === "error" ? "error" : "success"}`}>
          <span>{feedback.message}</span>
          <button type="button" className="btn-back" onClick={() => setFeedback({ type: "", message: "" })}>
            Dismiss
          </button>
        </div>
      )}

      <QRTable
        data={data}
        onQRClick={(qr) => setSelectedQR(qr)}
        editingId={editingId}
        setEditingId={setEditingId}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isLoading={isLoading}
        busyId={busyId}
      />

      {!isLoading && (
        <div className="qr-footer-actions">
          <button
            type="button"
            className="btn-back"
            onClick={loadQrRecords}
            disabled={busyId !== null}
          >
            Refresh
          </button>
        </div>
      )}

      {selectedQR && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setSelectedQR(null)} className="modal-close">
              x
            </button>
            <h3 className="modal-title">{selectedQR.accountName}</h3>
            <img
              src={selectedQR.qrImage}
              alt="QR Code"
              className="modal-image"
              onError={(event) => {
                event.currentTarget.src = buildGeneratedQr(selectedQR.upiId);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRList;
