import React from "react";
import { Check, Circle, Loader2, AlertTriangle, X, Minus } from "lucide-react";
import { formatDateTime } from "../../utils/apiDateFormat";
import { formatStageValue, getBookingStages, getStageState } from "../../utils/bookingLifecycle";
import "../../STYLES/BookingLifecycle.css";

const STATE_ICONS = {
  completed: Check,
  "in-progress": Loader2,
  warning: AlertTriangle,
  failed: X,
  pending: Circle,
  skipped: Minus,
};

export default function BookingLifecycle({ booking }) {
  const stages = getBookingStages(booking);

  return (
    <section className="booking-lifecycle" aria-label="Booking lifecycle">
      <h4 className="booking-lifecycle-heading">Booking Lifecycle</h4>
      {stages.length === 0 ? (
        <p className="booking-lifecycle-empty">Lifecycle information is not available for this booking.</p>
      ) : (
        <ol className="booking-lifecycle-list">
          {stages.map((stage, index) => {
            const state = getStageState(stage.status);
            const Icon = STATE_ICONS[state] || Circle;
            const metadata = stage.meta && typeof stage.meta === "object" && !Array.isArray(stage.meta)
              ? Object.entries(stage.meta)
              : [];

            return (
              <li className={`booking-lifecycle-stage booking-lifecycle-stage--${state}`} key={`${stage.key || "stage"}-${stage.stageIndex ?? index}-${index}`}>
                <span className="booking-lifecycle-marker" aria-hidden="true">
                  <Icon size={16} className={state === "in-progress" ? "booking-lifecycle-loading" : undefined} />
                </span>
                <div className="booking-lifecycle-content">
                  <div className="booking-lifecycle-stage-heading">
                    <h5>{formatStageValue(stage.name || stage.key || "Stage details unavailable")}</h5>
                    <span className="booking-lifecycle-status">{formatStageValue(stage.status)}</span>
                  </div>
                  <p className="booking-lifecycle-time">
                    <span>Timestamp: </span>{stage.timestamp == null || stage.timestamp === "" ? "--" : formatDateTime(stage.timestamp)}
                  </p>
                  <p className="booking-lifecycle-summary">{formatStageValue(stage.summary)}</p>
                  {metadata.length > 0 ? (
                    <dl className="booking-lifecycle-meta">
                      {metadata.map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{formatStageValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : stage.meta != null && stage.meta !== "" && (typeof stage.meta !== "object" || Array.isArray(stage.meta)) ? (
                    <div className="booking-lifecycle-meta"><span>Metadata</span><pre>{formatStageValue(stage.meta)}</pre></div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
