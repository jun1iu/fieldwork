import { runAll } from "./harness.js";
import "./dom.test.js";
import "./format.test.js";
import "./catalog.test.js";
import "./cart.test.js";
import "./app.test.js";

await runAll();
