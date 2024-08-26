class NotificationListItem extends HTMLElement {
  /**
   * @type {number | null}
   */
  #hideTimeoutID = null;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(document.createElement("slot"));
  }

  connectedCallback() {
    const parentElement = this.parentElement;

    if (!parentElement) {
      console.error("NotificationListItem must be a child of NotificationList");
      this.remove();
      return;
    }

    this.dataset.trans = "enter";

    this.role = "alert";
    this.ariaLive = "polite";

    requestAnimationFrame(() => {
      delete this.dataset.trans;
    });

    // Calculate the time the notification should be alive
    // based on the length of the message to ensure the user
    // has enough time to read it
    const aliveTime = 1500 + (this.textContent ?? "").length * 50;

    this.#hideTimeoutID = window.setTimeout(() => {
      this.dataset.trans = "leave";

      this.parentElement?.dispatchEvent(
        new Event("osb:notification-dismissed")
      );

      window.setTimeout(
        () => {
          this.remove();
        },
        // Match the transition duration for leave animations
        300
      );
    }, aliveTime);
  }

  disconnectedCallback() {
    if (this.#hideTimeoutID !== null) {
      window.clearTimeout(this.#hideTimeoutID);
    }
  }
}

window.customElements.define("notification-list-item", NotificationListItem);
