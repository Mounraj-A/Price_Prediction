from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def find_similar_products(products, threshold=0.85):

    if not products:
        return []

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