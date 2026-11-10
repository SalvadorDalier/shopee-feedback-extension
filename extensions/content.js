const MAX_PAGES = 50;
const PAGE_DELAY_MS = 1200;
const RENDER_WAIT_MS = 800;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queryAll(root, selector) {
  return Array.from(root.querySelectorAll(selector));
}

function waitForSelector(selector, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeoutMs);
  });
}

function extractOneReview(itemEl) {
  const cmtid = itemEl.dataset.cmtid || null;

  const stars = queryAll(itemEl, SELECTORS.star).length;

  const dateLineEl = itemEl.querySelector(SELECTORS.dateLine);
  let date = null;
  let variation = null;
  if (dateLineEl) {
    const raw = dateLineEl.textContent.trim();
    const parts = raw.split("|").map((s) => s.trim());
    date = parts[0] || null;
    if (parts[1]) {
      variation = parts[1].replace(/^Variation:\s*/i, "");
    }
  }

  const structuredEl = itemEl.querySelector(SELECTORS.structured);
  const structured = {};
  if (structuredEl) {
    const labelEls = queryAll(structuredEl, SELECTORS.label);
    labelEls.forEach((labelEl) => {
      const key = labelEl.textContent.trim();
      const valueEl = labelEl.nextElementSibling;
      if (key && valueEl) {
        structured[key] = valueEl.textContent.trim();
      }
    });
  }

  const freeTextEl = itemEl.querySelector(SELECTORS.freeText);
  const freeText = freeTextEl ? freeTextEl.textContent.trim() : "";

  return {
    cmtid,
    stars,
    date,
    variation,
    structured,
    freeText,
  };
}

function extractCurrentPageReviews() {
  const listEl = document.querySelector(SELECTORS.list);
  if (!listEl) return [];

  const items = queryAll(listEl, SELECTORS.item);
  return items.map(extractOneReview).filter((r) => r.cmtid !== null);
}

function getNextPageButton() {
  const pagerEl = document.querySelector(SELECTORS.pager);
  if (!pagerEl) return null;

  const btn = pagerEl.querySelector(SELECTORS.pageNext);
  if (!btn) return null;

  const isDisabled =
    btn.getAttribute("disabled") !== null ||
    btn.classList.contains("shopee-icon-button--disabled") ||
    btn.getAttribute("aria-disabled") === "true";

  return isDisabled ? null : btn;
}

async function crawlShopeeReviews() {
  const listWrapEl = await waitForSelector(SELECTORS.listWrap, 5000);
  if (!listWrapEl) {
    return { ok: false, reason: "NO_RATINGS_SECTION", reviews: [] };
  }

  listWrapEl.scrollIntoView({ behavior: "smooth", block: "center" });
  await delay(RENDER_WAIT_MS);

  const allReviews = [];
  const seenCmtids = new Set();
  let emptyStreak = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    await waitForSelector(SELECTORS.item, 3000);
    await delay(300);

    const pageReviews = extractCurrentPageReviews();

    let newCount = 0;
    pageReviews.forEach((r) => {
      if (!seenCmtids.has(r.cmtid)) {
        seenCmtids.add(r.cmtid);
        allReviews.push(r);
        newCount++;
      }
    });

    if (newCount === 0) {
      emptyStreak++;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
    }

    const nextBtn = getNextPageButton();
    if (!nextBtn) break;

    nextBtn.click();

    listWrapEl.scrollIntoView({ behavior: "smooth", block: "center" });
    await delay(PAGE_DELAY_MS);
  }

  return { ok: true, reviews: allReviews };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "EXTRACT_SHOPEE_REVIEWS") {
    crawlShopeeReviews()
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          reason: "EXCEPTION",
          error: String(err),
          reviews: [],
        }),
      );
    return true;
  }
});
