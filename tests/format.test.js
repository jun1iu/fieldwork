import { money, plural } from "../dist/js/format.js";
import { equal, test } from "./harness.js";

test("format: whole-dollar amounts drop the cents", () => {
  equal(money(8600), "$86");
  equal(money(0), "$0");
});

test("format: other amounts show exact cents", () => {
  equal(money(8650), "$86.50");
  equal(money(99), "$0.99");
  equal(money(123456), "$1,234.56");
});

test("format: integer cents sum exactly (no float drift)", () => {
  // 0.1 + 0.2 style errors cannot happen with integer cents
  equal(money(10 + 20), "$0.30");
  equal(money(3 * 2400 + 8600), "$158");
});

test("format: plural", () => {
  equal(plural(1, "item"), "1 item");
  equal(plural(0, "item"), "0 items");
  equal(plural(3, "item"), "3 items");
  equal(plural(2, "box", "boxes"), "2 boxes");
});
