from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from utils.product_utils import ensure_product_attributes_from_listing

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def _merge_same_product_key(products):
    """
    One representative listing per canonical product_key (best price).
    Stabilizes embedding clusters for the same SKU across platforms.
    """
    buckets = {}
    for p in products:
        ensure_product_attributes_from_listing(p)
        k = (p.get("productKey") or "").strip()
        cur = buckets.get(k)
        if cur is None:
            buckets[k] = p
        else:
            pa, pb = p.get("price") or 1e12, cur.get("price") or 1e12
            if pa < pb:
                buckets[k] = p
    return list(buckets.values())


def find_similar_products(products, threshold=0.85):

    if not products:
        return []

    products = _merge_same_product_key(products)

    titles = [p["normalizedName"] for p in products]

    embeddings = model.encode(titles, convert_to_numpy=True)

    similarity_matrix = cosine_similarity(embeddings)

    visited = set()
    final_products = []

    for i in range(len(products)):

        if i in visited:
            continue

        group = [products[i]]
        visited.add(i)

        for j in range(i + 1, len(products)):
            if similarity_matrix[i][j] >= threshold:
                group.append(products[j])
                visited.add(j)

        # 🔥 select best product
        best = min(group, key=lambda x: x["price"] if x["price"] else 999999)

        final_products.append(best)

    return final_products