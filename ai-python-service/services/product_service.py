from urllib.parse import unquote
from concurrent.futures import ThreadPoolExecutor

from scrapers.amazon_api import fetch_amazon_products
from scrapers.flipkart_api import fetch_flipkart_products
from scrapers.myntra_api import fetch_myntra_products
from scrapers.serpapi_google import fetch_google_products
from scrapers.serpapi_ebay import fetch_ebay_products
from scrapers.serpapi_walmart import fetch_walmart_products

from nlp.vector_matcher import find_similar_products
from nlp.duplicate_removal import remove_duplicates
from utils.ranking_engine import rank_products

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


similarity_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)


def semantic_filter(query, products, threshold=0.30):

    if not products:
        return []

    names = [p.get("productName", "") for p in products]

    query_embedding = similarity_model.encode([query])
    product_embeddings = similarity_model.encode(names)

    similarities = cosine_similarity(query_embedding, product_embeddings)[0]

    filtered = []

    for i, score in enumerate(similarities):
        if score >= threshold:
            filtered.append(products[i])

    return filtered


def search_products(product_name):

    product_name = unquote(product_name)

    print(f"[DEBUG] Searching for: {product_name}")

    try:

        with ThreadPoolExecutor(max_workers=6) as executor:

            amazon_future = executor.submit(fetch_amazon_products, product_name)
            flipkart_future = executor.submit(fetch_flipkart_products, product_name)
            myntra_future = executor.submit(fetch_myntra_products, product_name)
            google_future = executor.submit(fetch_google_products, product_name)
            ebay_future = executor.submit(fetch_ebay_products, product_name)
            walmart_future = executor.submit(fetch_walmart_products, product_name)

            amazon_products = amazon_future.result()
            flipkart_products = flipkart_future.result()
            myntra_products = myntra_future.result()
            google_products = google_future.result()
            ebay_products = ebay_future.result()
            walmart_products = walmart_future.result()

    except Exception as e:
        print("Error while fetching products:", e)
        return []

    print(
        f"[DEBUG] Amazon:{len(amazon_products)} | Flipkart:{len(flipkart_products)} | Myntra:{len(myntra_products)} | Google:{len(google_products)} | Ebay:{len(ebay_products)} | Walmart:{len(walmart_products)}"
    )

    all_products = (
        amazon_products
        + flipkart_products
        + myntra_products
        + google_products
        + ebay_products
        + walmart_products
    )

    print(f"[DEBUG] Total scraped: {len(all_products)}")

    unique_products = remove_duplicates(all_products)

    print(f"[DEBUG] After duplicate removal: {len(unique_products)}")

    semantic_products = semantic_filter(product_name, unique_products)

    print(f"[DEBUG] After semantic filter: {len(semantic_products)}")

    if not semantic_products:
        semantic_products = unique_products

    matched_products = find_similar_products(semantic_products)

    print(f"[DEBUG] After product matching: {len(matched_products)}")

    ranked_products = rank_products(matched_products)

    return ranked_products