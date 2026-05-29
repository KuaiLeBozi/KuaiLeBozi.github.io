(function () {
  const cursor = document.querySelector("#customCursor");
  if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;

  function updateCursor(event) {
    cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
    cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
    cursor.classList.add("is-visible");
  }

  function hideCursor() {
    cursor.classList.remove("is-visible");
  }

  window.addEventListener("pointermove", updateCursor, { passive: true });
  window.addEventListener("mousemove", updateCursor, { passive: true });
  window.addEventListener("pointerleave", hideCursor);
  window.addEventListener("blur", hideCursor);
})();
