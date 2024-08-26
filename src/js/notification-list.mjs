/**
 * @import { NotificationData } from './game-manager.mjs';
 */

class NotificationList extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(document.createElement("slot"));

    this.onNotification = this.onNotification.bind(this);
  }

  connectedCallback() {
    // @ts-ignore - TypeScript's typings for addEventListener are awful. Just can't comprehend custom events.
    document.addEventListener("osb:notify", this.onNotification);

    this.addEventListener("osb:notification-dismissed", () => {
      let index = 0;
      for (const child of this.children) {
        // Go through and update all remaining children's index variable
        // so they all shift up to replace the one that's being removed
        if (
          !(child instanceof HTMLElement) ||
          // Skip elements which are transitioning out
          child.dataset.trans === "leave"
        ) {
          continue;
        }
        child.style.setProperty("--i", String(index++));
      }
    });
  }

  disconnectedCallback() {
    // @ts-ignore - TypeScript's typings for addEventListener are awful. Just can't comprehend custom events.
    document.removeEventListener("osb:notify", this.onNotification);
  }

  /**
   * @param {CustomEvent<NotificationData>} evt
   */
  onNotification(evt) {
    const notificationElement = document.createElement(
      "notification-list-item"
    );

    notificationElement.dataset.status = evt.detail.status;
    notificationElement.style.setProperty(
      "--i",
      String(this.childElementCount)
    );
    notificationElement.textContent = evt.detail.message;

    this.appendChild(notificationElement);
  }
}

window.customElements.define("notification-list", NotificationList);
