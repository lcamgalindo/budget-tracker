import anthropic
import base64
import json
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

EXTRACTION_PROMPT = """Extract data from this receipt image. Return ONLY valid JSON with this structure:
{
    "merchant_name": "string or null",
    "transaction_date": "YYYY-MM-DD or null",
    "subtotal": number or null,
    "tax": number or null,
    "tip": number or null,
    "grand_total": number,
    "payment_method": "string or null",
    "line_items": [
        {"description": "string", "quantity": number, "total_price": number}
    ]
}

If a field is unclear, use null. grand_total is required - estimate from visible totals if needed."""

# Rule-based categorization for known merchants -> category slugs
MERCHANT_RULES: dict[str, tuple[str, float]] = {
    "starbucks": ("coffee", 0.95),
    "tim hortons": ("coffee", 0.95),
    "dunkin": ("coffee", 0.95),
    "mcdonalds": ("dining", 0.95),
    "burger king": ("dining", 0.95),
    "subway": ("dining", 0.95),
    "burrito": ("dining", 0.90),
    "taco": ("dining", 0.90),
    "pizza": ("dining", 0.90),
    "safeway": ("groceries", 0.95),
    "walmart": ("shopping", 0.80),
    "costco": ("groceries", 0.85),
    "save-on": ("groceries", 0.95),
    "whole foods": ("groceries", 0.95),
    "uber": ("transportation", 0.90),
    "lyft": ("transportation", 0.95),
    "shell": ("transportation", 0.90),
    "chevron": ("transportation", 0.90),
    "amazon": ("shopping", 0.75),
}


async def extract_receipt_data(image_bytes: bytes, media_type: str) -> dict:
    """Call Claude vision API to extract receipt data."""
    b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")
    
    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {"type": "text", "text": EXTRACTION_PROMPT}
                ],
            }
        ],
    )
    
    raw_text = response.content[0].text
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    
    return json.loads(raw_text.strip())


def categorize_by_rules(merchant_name: str | None) -> tuple[str, float] | None:
    """Try to categorize using merchant name rules. Returns (slug, confidence)."""
    if not merchant_name:
        return None
    
    merchant_lower = merchant_name.lower()
    for pattern, (slug, confidence) in MERCHANT_RULES.items():
        if pattern in merchant_lower:
            return (slug, confidence)
    return None


async def categorize_with_claude(
    merchant_name: str | None, 
    line_items: list,
    available_slugs: list[str]
) -> tuple[str, float]:
    """Fall back to Claude for categorization when rules don't match."""
    items_str = ", ".join([item.get("description", "") for item in line_items[:5]])
    
    prompt = f"""Based on this merchant name and items, assign a spending category.
Return ONLY valid JSON: {{"category": "category_slug", "confidence": 0.0-1.0}}

Valid category slugs: {", ".join(available_slugs)}

Merchant: {merchant_name or "Unknown"}
Items: {items_str or "Unknown"}"""
    
    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}],
    )
    
    raw_text = response.content[0].text
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    
    result = json.loads(raw_text.strip())
    return (result["category"], float(result["confidence"]))


async def process_receipt(
    image_bytes: bytes, 
    media_type: str,
    available_categories: list[dict]
) -> dict:
    """Full receipt processing pipeline: extract + categorize."""
    extracted = await extract_receipt_data(image_bytes, media_type)
    
    # Build slug -> id mapping
    slug_to_id = {cat["slug"]: cat["id"] for cat in available_categories}
    available_slugs = list(slug_to_id.keys())
    
    # Try rule-based categorization first
    rule_result = categorize_by_rules(extracted.get("merchant_name"))
    
    if rule_result and rule_result[0] in slug_to_id:
        slug, confidence = rule_result
    else:
        # Fall back to Claude
        slug, confidence = await categorize_with_claude(
            extracted.get("merchant_name"),
            extracted.get("line_items", []),
            available_slugs
        )
    
    category_id = slug_to_id.get(slug) or slug_to_id.get("other")
    
    return {
        "merchant_name": extracted.get("merchant_name"),
        "transaction_date": extracted.get("transaction_date"),
        "subtotal": extracted.get("subtotal"),
        "tax": extracted.get("tax"),
        "tip": extracted.get("tip"),
        "grand_total": extracted.get("grand_total"),
        "payment_method": extracted.get("payment_method"),
        "line_items": extracted.get("line_items", []),
        "category_id": category_id,
        "category_slug": slug,
        "category_confidence": confidence,
        "raw_extraction": extracted,
    }