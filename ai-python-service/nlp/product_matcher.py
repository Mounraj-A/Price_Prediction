import spacy

# Load spaCy model with vectors
nlp = spacy.load("en_core_web_md")

SIMILARITY_THRESHOLD = 0.7


def product_similarity(name1, name2):
    """
    Calculate similarity between two product names
    """

    if not name1 or not name2:
        return 0

    doc1 = nlp(name1)
    doc2 = nlp(name2)

    return doc1.similarity(doc2)


def is_relevant_product(query, product_name):
    """
    Filter unrelated products
    Example:
    Query = iPhone
    Remove Oppo, Vivo, Samsung
    """

    if not product_name:
        return False

    query_lower = query.lower()
    product_lower = product_name.lower()

    # strict keyword filtering
    if query_lower not in product_lower:
        return False

    similarity = product_similarity(query, product_name)

    return similarity >= SIMILARITY_THRESHOLD