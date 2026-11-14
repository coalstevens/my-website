/* Short-lived archive feedback; callers invalidate undo on subsequent changes. */
const ArchiveFeedback = (() => {
  function create(container, {delay = 6000, schedule = setTimeout, cancel = clearTimeout} = {}) {
    let timer = null, undo = null, hovered = false;
    function clear() {
      cancel(timer);
      timer = null;
      undo = null;
      container.replaceChildren();
    }
    function startTimer() {
      cancel(timer);
      if (undo && !hovered && !container.contains(container.ownerDocument.activeElement)) {
        timer = schedule(clear, delay);
      }
    }
    container.addEventListener('mouseenter', () => { hovered = true; cancel(timer); });
    container.addEventListener('mouseleave', () => { hovered = false; startTimer(); });
    container.addEventListener('focusin', () => cancel(timer));
    container.addEventListener('focusout', event => {
      cancel(timer);
      if (undo && !hovered && !container.contains(event.relatedTarget)) timer = schedule(clear, delay);
    });
    return {
      clear,
      show(message, callback) {
        clear();
        undo = callback;
        const text = container.ownerDocument.createElement('span');
        text.textContent = message;
        const button = container.ownerDocument.createElement('button');
        button.type = 'button';
        button.textContent = 'undo';
        button.setAttribute('aria-label', `Undo: ${message}`);
        button.addEventListener('click', () => {
          const restore = undo;
          if (!restore) return;
          // Only dismiss on success so a failed local write can be retried.
          if (restore() !== false) clear();
        });
        container.replaceChildren(text, button);
        startTimer();
      }
    };
  }
  return {create};
})();
if (typeof module !== 'undefined') module.exports = ArchiveFeedback;
