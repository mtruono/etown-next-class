export type Child = Node | string | number | null | undefined | false;

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    id?: string;
    text?: string;
    attributes?: Record<string, string>;
  } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    node.setAttribute(name, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  return node;
}

export function actionButton(
  label: string,
  onClick: () => void | Promise<void>,
  options: {
    className?: string;
    type?: "button" | "submit";
    disabled?: boolean;
    ariaLabel?: string;
  } = {},
): HTMLButtonElement {
  const button = element("button", {
    className: options.className ?? "button",
    text: label,
    attributes: options.ariaLabel
      ? { "aria-label": options.ariaLabel }
      : undefined,
  });
  button.type = options.type ?? "button";
  button.disabled = options.disabled ?? false;
  button.addEventListener("click", () => void onClick());
  return button;
}

export function externalLink(
  label: string,
  href: string,
  className = "button button-secondary",
): HTMLAnchorElement {
  const link = element("a", {
    className,
    text: label,
    attributes: {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      referrerpolicy: "no-referrer",
    },
  });
  return link;
}

export function viewShell(
  title: string,
  main: HTMLElement,
  options: {
    subtitle?: string;
    headerAction?: HTMLElement;
    live?: boolean;
  } = {},
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const header = element(
    "header",
    { className: "app-header" },
    element(
      "div",
      { className: "brand-lockup" },
      element("p", { className: "eyebrow", text: "ETOWN · CAMPUS COMPANION" }),
      element("h1", { text: title }),
      options.subtitle
        ? element("p", { className: "header-subtitle", text: options.subtitle })
        : null,
    ),
    options.headerAction,
  );
  main.id = "main-content";
  main.tabIndex = -1;
  if (options.live) {
    main.setAttribute("aria-live", "polite");
    main.setAttribute("aria-atomic", "false");
  }
  const footer = element(
    "footer",
    { className: "app-footer" },
    element("p", {
      text: "Unofficial campus companion · Building locations are approximate.",
    }),
  );
  fragment.append(header, main, footer);
  return fragment;
}
