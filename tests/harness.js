/** A minimal test harness: no dependencies, runs in any browser. */

const tests = [];

export const test = (name, fn) => tests.push({ name, fn });

export function assert(condition, message = "assertion failed") {
  if (!condition) throw new Error(message);
}

export function equal(actual, expected, message = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message ? `${message}: ` : ""}expected ${e}, got ${a}`);
}

/** Assert that `fn` throws (sync or async); optionally that its message matches `pattern`. */
export async function throws(fn, pattern) {
  try {
    await fn();
  } catch (error) {
    if (pattern && !pattern.test(String(error && error.message))) {
      throw new Error(`threw "${error.message}", expected to match ${pattern}`);
    }
    return;
  }
  throw new Error("expected a throw, but nothing was thrown");
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAll() {
  const log = document.getElementById("log");
  let failed = 0;
  for (const { name, fn } of tests) {
    const item = document.createElement("li");
    try {
      await fn();
      item.className = "pass";
      item.textContent = name;
    } catch (error) {
      failed++;
      item.className = "fail";
      item.textContent = `${name} -- ${error && error.message}`;
      console.error(name, error);
    }
    log.append(item);
  }
  const summary = document.getElementById("summary");
  summary.textContent = `${failed ? "FAIL" : "PASS"} ${tests.length - failed}/${tests.length} tests`;
  document.documentElement.dataset.result = failed ? "fail" : "pass";
}
