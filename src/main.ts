import { init, render, appendChild } from "./render.ts";

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("No #app found");
}

function createChild(): HTMLElement {
  const height = Math.floor(Math.random() * 100) + 20;
  const el = document.createElement("p");
  el.textContent = `Height: ${height}px`;
  el.style.border = "1px solid #ccc";
  el.style.height = `${height}px`;
  return el;
}

const children = Array.from({ length: 30 }, createChild);

const { context, root } = init({ children })
app.appendChild(root);
render(context)


let count = 0;
const interval = setInterval(() => {
  count++;
  if (count > 10) {
    clearInterval(interval);
  }
  const newChildren = Array.from({ length: 10 }, createChild);
  appendChild(context, newChildren);
}, 1000);
