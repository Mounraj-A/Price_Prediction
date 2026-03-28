/**
 * groupByProductKey
 * Groups an array of Product objects by their productKey field.
 * Falls back to lowercased productName if productKey is absent.
 *
 * @param {Product[]} products
 * @returns {Map<string, Product[]>}
 */
export function groupByProductKey(products) {
  const map = new Map();
  for (const p of products) {
    const key = (p.productKey || p.productName || "unknown").toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return map;
}

/**
 * getCheapest
 * Returns the item with the lowest price in the group.
 *
 * @param {Product[]} group
 * @returns {Product}
 */
export function getCheapest(group) {
  if (!group || group.length === 0) return null;
  
  return group.reduce((minItem, currentItem) => {
    const minPrice = parseFloat(minItem.price) || 0;
    const currentPrice = parseFloat(currentItem.price) || 0;
    return currentPrice < minPrice ? currentItem : minItem;
  }, group[0]);
}

/**
 * buildSaveKey
 * 🔥 FIX: Removed standard "productKey" from this generation. 
 * By linking only Platform and ProductName, the UI will recognize 
 * Color and Storage variants as completely unique items, allowing multiple saves!
 *
 * @param {Product} product
 * @returns {string}  e.g. "flipkart::apple iphone 17e (black, 256 gb)"
 */
export function buildSaveKey(product) {
  const platform = (product.platform || "unknown").toLowerCase().trim();
  const name = (product.productName || "unknown").toLowerCase().trim();
  
  return `${platform}::${name}`;
}

/**
 * priceDiff
 * Returns a formatted price difference label comparing saved price to current.
 *
 * @param {number} savedPrice
 * @param {number} currentPrice
 * @returns {{ diff: number, pct: string, direction: "down"|"up"|"same", label: string }}
 */
export function priceDiff(savedPrice, currentPrice) {
  const diff = savedPrice - currentPrice;
  const pct = ((Math.abs(diff) / savedPrice) * 100).toFixed(1);
  if (diff > 0) return { diff, pct, direction: "down", label: `📉 -₹${diff.toLocaleString("en-IN")} (${pct}% ↓)` };
  if (diff < 0) return { diff, pct, direction: "up",   label: `📈 +₹${Math.abs(diff).toLocaleString("en-IN")} (${pct}% ↑)` };
  return { diff: 0, pct: "0.0", direction: "same", label: "Price unchanged" };
}