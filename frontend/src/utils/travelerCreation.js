export function validateNewTraveler(traveler) {
  const errors = {};
  if (!["Mr", "Mrs", "Ms"].includes(traveler.title)) errors.title = "Select a valid title (Mr, Mrs, or Ms)";
  if (!String(traveler.fullName || "").trim()) errors.fullName = "Full name required";
  if (traveler.age == null || String(traveler.age).trim() === "") {
    errors.age = "Age required";
  } else if (!Number.isInteger(Number(traveler.age)) || Number(traveler.age) < 0 || Number(traveler.age) > 120) {
    errors.age = "Enter a valid whole-number age (0-120)";
  }
  if (!traveler.gender) errors.gender = "Select gender";
  else if (!["Male", "Female", "Other"].includes(traveler.gender)) errors.gender = "Gender must be Male, Female, or Other";
  return errors;
}

export function toNewTravelerData(traveler) {
  const name = traveler.fullName;
  const age = Number(traveler.age);
  const dob = `${new Date().getFullYear() - age}-01-01`;
  return {
    name, firstName: name, lastName: "", age, gender: traveler.gender,
    type: age < 18 ? "Child" : "Adult",
    title: traveler.title,
    dob, dobInput: dob, email: "", phone: "", mobile: "", passportNo: "", country: "India",
  };
}

// Supports indexed model-validation paths such as $[1].Age and per-item error objects.
export function getTravelerCreationErrors(payload, count) {
  const fields = Array.from({ length: count }, () => ({}));
  const fieldName = (name) => {
    const key = String(name).replace(/[^a-z]/gi, "").toLowerCase();
    if (["fullname", "name", "firstname", "lastname"].includes(key)) return "fullName";
    if (["title", "age", "gender"].includes(key)) return key;
    return "form";
  };
  const assign = (index, name, value) => {
    if (!Number.isInteger(index) || index < 0 || index >= count) return;
    const message = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
    if (message) fields[index][fieldName(name)] = message;
  };
  const errors = Array.isArray(payload) ? payload : payload?.errors || payload?.validationErrors || payload?.itemErrors;
  if (Array.isArray(errors)) {
    errors.forEach((item, position) => {
      if (!item || typeof item !== "object") return;
      const index = Number(item.index ?? item.itemIndex ?? item.travelerIndex ?? position);
      if (item.field || item.fieldName) assign(index, item.field || item.fieldName, item.message || item.error);
      const details = item.errors || item;
      Object.entries(details).forEach(([name, value]) => assign(index, name, value));
    });
  } else if (errors && typeof errors === "object") {
    Object.entries(errors).forEach(([path, value]) => {
      const indexed = path.match(/\[(\d+)\]/) || path.match(/^(\d+)\./);
      const index = indexed ? Number(indexed[1]) : count === 1 ? 0 : -1;
      const name = path.split(/[.\[\]]/).filter(Boolean).pop();
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const itemIndex = /^\d+$/.test(path) ? Number(path) : index;
        Object.entries(value).forEach(([field, message]) => assign(itemIndex, field, message));
      } else assign(index, name, value);
    });
  }
  return fields;
}
