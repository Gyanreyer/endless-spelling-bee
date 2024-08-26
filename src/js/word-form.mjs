class WordForm extends HTMLElement {
  /**
   * @type {HTMLFormElement | null}
   */
  formElement = null;

  /**
   * @type {HTMLInputElement | null}
   */
  inputElement = null;

  static invalidLettersRegex = new RegExp(
    `[^${
      window.__GAME_DATA__.today.centerLetter
    }${window.__GAME_DATA__.today.outerLetters.join("")}]`,
    "g"
  );

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.appendChild(document.createElement("slot"));

    this.onSubmit = this.onSubmit.bind(this);
    this.onInput = this.onInput.bind(this);
    this.onLetterClick = this.onLetterClick.bind(this);
  }

  connectedCallback() {
    this.formElement = this.getElementsByTagName("form")[0];
    if (!this.formElement) {
      throw new Error("word-form component must contain a form element");
    }

    this.formElement.addEventListener("submit", this.onSubmit);

    this.inputElement = this.formElement.getElementsByTagName("input")[0];
    if (!this.inputElement) {
      throw new Error("word-form component must contain an input element");
    }

    this.inputElement.addEventListener("input", this.onInput);

    document.addEventListener("osb:letter-click", this.onLetterClick);
  }

  disconnectedCallback() {
    this.formElement?.removeEventListener("submit", this.onSubmit);
    this.inputElement?.removeEventListener("input", this.onInput);
    document.removeEventListener("osb:letter-click", this.onLetterClick);
  }

  /**
   * @param {SubmitEvent} event
   */
  onSubmit(event) {
    event.preventDefault();

    if (!this.formElement) {
      throw new Error("Could not find form element");
    }

    const formData = new FormData(this.formElement);
    const word = formData.get("word");

    if (!word || typeof word !== "string") {
      return;
    }

    document.dispatchEvent(
      new CustomEvent("osb:guess", {
        detail: {
          word,
        },
      })
    );

    this.formElement.reset();
  }

  /**
   * @param {Event} event
   */
  onInput(event) {
    const inputElement = event.currentTarget;
    if (inputElement instanceof HTMLInputElement) {
      // Strip all invalid letters from the input
      const sanitizedValue = inputElement.value
        .toLowerCase()
        .replaceAll(WordForm.invalidLettersRegex, "");
      inputElement.value = sanitizedValue;
    }
  }

  /**
   * @param {Event} event
   */
  onLetterClick(event) {
    console.log("ON LETTER CLICK");

    if (
      !(event instanceof CustomEvent) ||
      typeof event.detail.letter !== "string"
    ) {
      throw new Error("Invalid letter-click event");
    }

    if (!this.inputElement) {
      throw new Error("Could not find input element");
    }

    console.log(event.detail.letter);

    this.inputElement.value += event.detail.letter;
  }
}

window.customElements.define("word-form", WordForm);
