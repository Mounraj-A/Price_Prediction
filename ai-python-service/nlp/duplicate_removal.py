def remove_duplicates(products):

    seen = set()
    result = []

    for p in products:

        key = (
            p.get("normalizedName"),
            p.get("platform")
        )

        if key not in seen:
            seen.add(key)
            result.append(p)

    return result