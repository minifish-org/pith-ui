import type {Page} from '@playwright/test';

// Literal accepted0.3.1 styles.css:169–184/820–823, without PUI classes or
// library modules. The native select and visible caption share a grid track:
// the caption owns its18px line +16px padding, while the native theme can
// require a taller row. A bare select alone is not the original composition.
export async function measureSourceEffort(page: Page, labels: readonly string[]) {
  return page.evaluate(labels => {
    const frame = document.createElement('iframe');
    frame.title = 'Independent source-native effort measurement';
    document.body.append(frame);
    try {
      const doc = frame.contentDocument!, row = doc.createElement('span');
      row.style.cssText = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:18px;font-weight:400;position:relative;display:inline-grid;min-width:0;width:auto;max-width:132px;";
      const select = doc.createElement('select');
      select.style.cssText = 'font:inherit;box-sizing:border-box;grid-area:1/1;height:100%;min-height:0;max-width:132px;padding:8px 4px;border:0;opacity:0;pointer-events:none;clip-path:inset(50%);';
      for (const label of labels) {
        const option = doc.createElement('option');
        option.textContent = label;
        select.append(option);
      }
      const trigger = doc.createElement('button');
      trigger.type = 'button';
      trigger.style.cssText = 'font:inherit;box-sizing:border-box;grid-area:1/1;width:0;min-width:100%;display:inline-flex;align-items:center;justify-content:space-between;min-height:0;max-width:132px;padding:8px 4px;border:0;';
      const caption = doc.createElement('span');
      caption.textContent = labels[0] ?? '';
      trigger.append(caption);
      row.append(select, trigger);
      doc.body.append(row);
      if (doc.querySelector('[class]')) throw new Error('Source oracle must not use Pith UI classes');
      const rect = row.getBoundingClientRect();
      return {width: rect.width, height: rect.height};
    } finally {frame.remove();}
  }, [...labels]);
}
