// src/lib/humanize.ts
// Turns raw incident fields into a human sentence for the VIOLATION display.
// The RULE (plain-English instruction) is shown separately — never mixed in here.

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeViolation(inc: {
  violation?: string | null;
  person_id?: number | null;
  zone?: string | null;
}): string {
  const v = (inc.violation || "").toLowerCase();
  const zone = (inc.zone || "").replace(/_/g, " ").trim();
  const zonePart = zone ? ` in ${zone}` : "";
  const person =
    inc.person_id != null ? `Person #${inc.person_id}` : "A worker";

  if (!v) return "Violation";

  // missing_helmet, missing_vest, missing_gloves...
  if (v.startsWith("missing_")) {
    const gear = v.slice("missing_".length).replace(/_/g, " ");
    return `${person} entered${zonePart || " the area"} without a ${gear}`;
  }

  // near_spill, near_forklift... (proximity rules)
  if (v.startsWith("near_")) {
    const target = v.slice("near_".length).replace(/_/g, " ");
    return `${person} went near a ${target}${zonePart}`;
  }

  // spill_detected, fire_detected, smoke_detected, truck_detected... (object rules)
  if (v.endsWith("_detected")) {
    const target = v.slice(0, -"_detected".length).replace(/_/g, " ");
    return `${titleCase(target)} detected${zonePart || " on site"}`;
  }

  if (v === "person_in_zone") {
    return `${person} entered${zonePart || " the restricted area"}`;
  }

  if (v === "count_exceeded") {
    return `Too many people${zonePart || " in the monitored area"}`;
  }

  // Unknown violation types fall back to the old title-cased label
  return titleCase(v);
}
