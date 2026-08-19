export const AUTH_MODAL_EVENT = "picknbook:open-auth-modal";

export function openAuthModal(mode = "login", detail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_MODAL_EVENT, {
      detail: {
        mode,
        ...detail,
      },
    })
  );
}
