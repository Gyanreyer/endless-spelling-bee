class NotificationList extends HTMLElement {
  /**
   * @type {CSSStyleSheet}
   */
  static STYLESHEET;
  /**
   * @type {HTMLTemplateElement}
   */
  static TEMPLATE;

  /**
   *
   * @param {CustomEvent<{
   *  message: string;
   *  ariaLabel: string;
   *  status: "error" | "success";
   * }>} evt
   */
  onNotification(evt) {
    const notificationElement = document.createElement(
      "notification-list-item"
    );
    notificationElement.role = "alert";
    notificationElement.ariaLive = "polite";
    notificationElement.ariaLabel = evt.detail.ariaLabel;
    notificationElement.dataset.status = evt.detail.status;
    notificationElement.style.setProperty(
      "--i",
      String(this.childElementCount)
    );
    notificationElement.textContent = evt.detail.message;

    this.appendChild(notificationElement);
  }

  constructor() {
    super();
    this.onNotification = this.onNotification.bind(this);

    if (!NotificationList.TEMPLATE) {
      NotificationList.TEMPLATE = document.createElement("template");
      NotificationList.TEMPLATE.innerHTML = /* html */ `<slot>`;
    }

    if (!NotificationList.STYLESHEET) {
      NotificationList.STYLESHEET = new CSSStyleSheet();
      NotificationList.STYLESHEET.replaceSync(/* css */ `
:host {
  display: block;
  position: relative;
  height: 2rem;
  margin: 1rem auto;
}
`);
    }

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(NotificationList.TEMPLATE.content.cloneNode(true));
    shadowRoot.adoptedStyleSheets = [NotificationList.STYLESHEET];
  }

  connectedCallback() {
    // @ts-ignore
    document.addEventListener("osb:notify", this.onNotification);

    this.addEventListener("osb:notification-dismissed", () => {
      let index = 0;
      for (const child of this.children) {
        if (
          !(child instanceof HTMLElement) ||
          // Skip elements which are transitioning out
          child.dataset.trans === "leave"
        ) {
          continue;
        }
        /** @type {HTMLElement} */ (child).style.setProperty(
          "--i",
          String(index++)
        );
      }
    });
  }

  disconnectedCallback() {
    // @ts-ignore
    document.removeEventListener("osb:notify", this.onNotification);
  }
}

window.customElements.define("notification-list", NotificationList);
