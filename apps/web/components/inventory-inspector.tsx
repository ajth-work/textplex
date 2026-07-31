"use client";

import { useEffect, useState } from "react";

const INVENTORY_LABELS_KEY = "textplex.inventoryLabels";

function readStoredInventoryLabelsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(INVENTORY_LABELS_KEY) === "on";
}

function applyInventoryLabelsEnabled(enabled: boolean): void {
  const value = enabled ? "on" : "off";
  document.documentElement.dataset.inventoryLabels = value;
  window.localStorage.setItem(INVENTORY_LABELS_KEY, value);
}

export function InventoryInspectorToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    applyInventoryLabelsEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    const handleStorage = () => {
      setEnabled(readStoredInventoryLabelsEnabled());
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <button
      type="button"
      className={`inventory-inspector-toggle button ${enabled ? "button-primary is-active" : "button-secondary"}`}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable inventory labels" : "Enable inventory labels"}
      title={enabled ? "Inventory labels on" : "Inventory labels off"}
      onClick={() => setEnabled((current) => !current)}
    >
      <span className="inventory-inspector-toggle-dot" aria-hidden="true" />
      <span>{enabled ? "Labels on" : "Labels off"}</span>
    </button>
  );
}
