"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { ConsumerRefundState } from "@/services/consumer-refund";
import { BankDestination } from "./BankDestination";
import { EventTimeline } from "./EventTimeline";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { ObligationToken } from "./ObligationToken";
import { OutcomeMetrics } from "./OutcomeMetrics";
import { OwedHeader } from "./OwedHeader";
import { PolicyChecks } from "./PolicyChecks";
import { RefundAuthorization } from "./RefundAuthorization";
import { RefundContext } from "./RefundContext";
import { ReissueRemoval } from "./ReissueRemoval";
import { TransparencyDrawer } from "./TransparencyDrawer";

type PendingAction = "validate" | "authorize" | "payment" | "reset" | null;

async function readState(response: Response): Promise<ConsumerRefundState> {
  const payload = (await response.json()) as ConsumerRefundState | { error: string };
  if (!response.ok) {
    throw new Error("error" in payload ? payload.error : "The demo could not continue");
  }
  return payload as ConsumerRefundState;
}

export function OwedJourney({
  initialState,
  initiallyRepairing,
}: {
  initialState: ConsumerRefundState;
  initiallyRepairing: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [repairOpen, setRepairOpen] = useState(
    initiallyRepairing || initialState.destination.validationStatus !== "UNVALIDATED",
  );
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const processingStarted = useRef(false);

  async function post(path: string, action: Exclude<PendingAction, null>) {
    setPending(action);
    setError(null);
    try {
      const next = await readState(await fetch(path, { method: "POST" }));
      setState(next);
      return next;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The demo could not continue");
      throw caught;
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    if (state.phase !== "RETRY_SCHEDULED" || processingStarted.current) return;
    processingStarted.current = true;
    setPending("payment");

    const poll = window.setInterval(async () => {
      try {
        const refreshed = await readState(
          await fetch("/api/owed", { cache: "no-store" }),
        );
        setState(refreshed);
      } catch {
        // The processing request remains authoritative; its response reports errors.
      }
    }, 300);

    void awaitableFetch("/api/owed/process")
      .then(readState)
      .then((completed) => {
        setState(completed);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Payment processing paused");
      })
      .finally(() => {
        window.clearInterval(poll);
        setPending(null);
      });
  }, [state.phase]);

  function revealRepair() {
    setRepairOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("repair", "destination");
    window.history.replaceState(null, "", url);
  }

  async function restart() {
    try {
      const reset = await post("/api/owed/reset", "reset");
      processingStarted.current = false;
      setRepairOpen(false);
      window.history.replaceState(null, "", window.location.pathname);
      setState(reset);
    } catch {
      // Error is rendered in the status region.
    }
  }

  const showDestination =
    repairOpen || state.destination.validationStatus !== "UNVALIDATED";
  const paymentResumed = [
    "RETRY_SCHEDULED",
    "RETRY_PROCESSING",
    "DELIVERED",
    "COMPLETED",
  ].includes(state.phase);
  const complete = state.refund.status === "COMPLETED";

  return (
    <main id="top" className="owed-shell">
      <OwedHeader onRestart={() => void restart()} disabled={pending !== null} />
      <div className="page-grid">
        <aside className="identity-rail" aria-label="Citizen">
          <p className="citizen-name">{state.citizen.name}</p>
          <p>{state.citizen.age} · {state.citizen.occupation}</p>
          <p className="synthetic-note">Synthetic demonstration record</p>
        </aside>
        <div className="journey-column">
          <ObligationToken refund={state.refund} />
          <RefundContext state={state} />

          <section className="repair-section" aria-labelledby="repair-heading">
            <div className="repair-heading-row">
              <div>
                <p className="section-number">02 / Repair destination</p>
                <h2 id="repair-heading" className="section-title font-editorial">Give the existing refund somewhere valid to go.</h2>
              </div>
              {!showDestination && !complete ? (
                <button className="primary-action" type="button" onClick={revealRepair}>Fix where my refund goes</button>
              ) : null}
            </div>

            <AnimatePresence initial={false}>
              {showDestination ? (
                <motion.div key="destination" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <BankDestination destination={state.destination} />
                  {state.destination.validationStatus === "UNVALIDATED" ? (
                    <button className="primary-action destination-action" type="button" disabled={pending !== null} onClick={() => void post("/api/owed/validate", "validate").catch(() => undefined)}>
                      {pending === "validate" ? "Validating with simulated bank…" : "Validate account"}
                    </button>
                  ) : null}
                  {state.destination.validationStatus === "VALIDATED" && !state.destination.refundAuthorized ? (
                    <RefundAuthorization onAuthorize={() => void post("/api/owed/authorize", "authorize").catch(() => undefined)} pending={pending === "authorize"} />
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          <AnimatePresence>
            {pending === "authorize" ? (
              <motion.div className="working-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
                <span className="working-dot" aria-hidden="true" /> Checking unfinished payments…
              </motion.div>
            ) : null}
          </AnimatePresence>

          <PolicyChecks checks={state.checks} amount={state.refund.displayAmount} />
          {paymentResumed ? <ReissueRemoval /> : null}
          {pending === "payment" || state.phase === "RETRY_PROCESSING" ? (
            <div className="delivery-progress" role="status"><span className="working-dot" aria-hidden="true" /> Simulated bank delivery in progress</div>
          ) : null}
          {complete ? <OutcomeMetrics state={state} /> : null}
          <EventTimeline events={state.timeline} />

          {error ? <p className="error-message" role="alert">{error}</p> : null}
          <div className="disclosures"><TransparencyDrawer /><EvidenceDrawer /></div>
        </div>
      </div>
    </main>
  );
}

function awaitableFetch(path: string): Promise<Response> {
  return fetch(path, { method: "POST" });
}
