class NotificationListItem extends HTMLElement {
  /**
   * @type {HTMLTemplateElement}
   */
  static TEMPLATE;
  /**
   * @type {CSSStyleSheet}
   */
  static STYLESHEET;

  static LEAVE_TRANSITION_DURATION = 300;

  /**
   * @type {number | null}
   */
  #hideTimeoutID = null;

  constructor() {
    super();

    if (!NotificationListItem.TEMPLATE) {
      NotificationListItem.TEMPLATE = document.createElement("template");
      NotificationListItem.TEMPLATE.innerHTML = /* html */ `<slot>`;
    }
    if (!NotificationListItem.STYLESHEET) {
      NotificationListItem.STYLESHEET = new CSSStyleSheet();
      NotificationListItem.STYLESHEET.replaceSync(/* css */ `
:host {
  display: block;
  position: absolute;
  top: 0;
  left: 50%;
  --base-translate-y: calc(var(--i) * 120%);
  transform: translate(-50%, var(--base-translate-y));
  transition: transform 0.3s;
  margin: 0 auto;
  box-shadow: 0px 1px 5px rgba(0, 0, 0, 0.25);
  padding: 0.5rem;
  border-radius: 0.5rem;
  z-index: 10;
  white-space: nowrap;
}

:host([data-status=success]) {
  background-image: var(--gradient);
  color: white;
}

:host([data-status=error]) {
  background-color: var(--yellow);
  color: var(--black);
}

@keyframes shake {
  0%,
  100% {
    transform: translate(-50%, var(--base-translate-y));
  }
  25% {
    transform: translate(-53%, var(--base-translate-y));
  }
  75% {
    transform: translate(-47%, var(--base-translate-y));
  }
}

@media (prefers-reduced-motion: no-preference) {
  :host([data-status=success][data-trans=enter]) {
    opacity: 0;
    transform: translate(-50%, calc(var(--base-translate-y) + 25%));
    transition: opacity 0.3s, transform 0.3s;
  }

  :host([data-status=error]) {
    animation: shake 0.2s linear;
  }

  :host([data-trans=leave]) {
    opacity: 0;
    transform: translate(-50%, calc(var(--base-translate-y) + 25%));
    transition-property: opacity, transform;
    transition-duration: ${NotificationListItem.LEAVE_TRANSITION_DURATION}ms;
  }
}
`);
    }

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(
      NotificationListItem.TEMPLATE.content.cloneNode(true)
    );
    shadowRoot.adoptedStyleSheets = [NotificationListItem.STYLESHEET];
  }

  connectedCallback() {
    const parentElement = this.parentElement;

    if (!parentElement) {
      console.error("NotificationListItem must be a child of NotificationList");
      this.remove();
      return;
    }

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

      window.setTimeout(() => {
        this.remove();
      }, 300);
    }, aliveTime);
  }

  disconnectedCallback() {
    if (this.#hideTimeoutID !== null) {
      window.clearTimeout(this.#hideTimeoutID);
    }
  }
}

window.customElements.define("notification-list-item", NotificationListItem);
