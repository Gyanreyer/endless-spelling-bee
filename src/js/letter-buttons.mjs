export class LetterButtons extends HTMLElement {
  /**
   * @type {HTMLButtonElement | null}
   */
  shuffleButton = null;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(document.createElement("slot"));

    this.onButtonClick = this.onButtonClick.bind(this);
    this.addEventListener("click", this.onButtonClick);

    this.shuffle = this.shuffle.bind(this);
    const shuffleButton = document.getElementById("shuffle-button");
    if (!(shuffleButton instanceof HTMLButtonElement)) {
      throw new Error("shuffle-button element not found");
    }

    this.shuffleButton = shuffleButton;
  }

  connectedCallback() {
    this.shuffleButton?.addEventListener("click", this.shuffle);
  }
  disconnectedCallback() {
    this.shuffleButton?.removeEventListener("click", this.shuffle);
  }

  shuffle() {
    // Randomly shuffle the ordering of the outer letter buttons
    const outerLetterButtons = Array.from(this.querySelectorAll(".outer"));
    for (let i = 0; i < 6; ++i) {
      const j = Math.floor(Math.random() * 6);

      const temp = outerLetterButtons[i];
      outerLetterButtons[i] = outerLetterButtons[j];
      outerLetterButtons[j] = temp;
    }

    // Prepending the buttons in the new order will automatically
    // remove them from their current position in the DOM
    this.prepend(...outerLetterButtons);
  }

  /**
   * @param {Event} event
   */
  onButtonClick(event) {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const letter = button.textContent;

    document.dispatchEvent(
      new CustomEvent("osb:letter-click", {
        detail: {
          letter,
        },
      })
    );
  }
}

window.customElements.define("letter-buttons", LetterButtons);
